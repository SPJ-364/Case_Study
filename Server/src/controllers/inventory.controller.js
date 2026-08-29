import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { logActivity } from '../services/activityLog.service.js';
import { refreshAlertsForProduct, refreshAllAlerts } from '../services/alert.service.js';

const SELECT = `
  inventory_id, current_stock, minimum_stock, reorder_point, location, last_updated,
  product:products (
    product_id, product_name, sku, unit_price, status, expiration_date,
    category:categories ( category_id, category_name ),
    supplier:suppliers ( supplier_id, supplier_name )
  ),
  updated_by_user:users!inventory_updated_by_fkey ( full_name )
`;

const statusOf = (r) => {
  if (r.current_stock === 0) return 'out_of_stock';
  if (r.current_stock <= r.minimum_stock) return 'low_stock';
  if (r.current_stock <= r.reorder_point) return 'reorder';
  return 'in_stock';
};

/** GET /api/inventory - the stock monitoring list. */
export const listInventory = asyncHandler(async (req, res) => {
  const { status, search, categoryId } = req.query;

  const { data, error } = await supabaseAdmin
    .from('inventory').select(SELECT).order('inventory_id');
  if (error) throw new ApiError(500, error.message);

  let rows = data
    .filter((r) => r.product)
    .map((r) => ({ ...r, stock_status: statusOf(r) }));

  if (status) rows = rows.filter((r) => r.stock_status === status);
  if (categoryId) rows = rows.filter((r) => r.product.category?.category_id === Number(categoryId));
  if (search) {
    const s = String(search).toLowerCase();
    rows = rows.filter((r) =>
      r.product.product_name.toLowerCase().includes(s) ||
      r.product.sku.toLowerCase().includes(s));
  }

  ok(res, rows, { total: rows.length });
});

/** GET /api/inventory/summary - the dashboard stat cards. */
export const inventorySummary = asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('current_stock, minimum_stock, reorder_point, product:products ( unit_price, status )');
  if (error) throw new ApiError(500, error.message);

  const rows = data.filter((r) => r.product);
  const summary = rows.reduce((acc, r) => {
    const st = statusOf(r);
    acc.totalProducts += 1;
    acc.totalQuantity += r.current_stock;
    acc.totalValue    += r.current_stock * Number(r.product.unit_price || 0);
    if (st === 'low_stock')    acc.lowStock += 1;
    if (st === 'out_of_stock') acc.outOfStock += 1;
    if (st === 'reorder')      acc.reorderDue += 1;
    return acc;
  }, { totalProducts: 0, totalQuantity: 0, totalValue: 0, lowStock: 0, outOfStock: 0, reorderDue: 0 });

  const { count: activeAlerts } = await supabaseAdmin
    .from('alerts').select('alert_id', { count: 'exact', head: true }).eq('alert_status', 'active');

  summary.totalValue = Number(summary.totalValue.toFixed(2));
  summary.activeAlerts = activeAlerts ?? 0;
  ok(res, summary);
});

export const thresholdSchema = z.object({
  minimumStock: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  location: z.string().optional(),
});

/** PATCH /api/inventory/:productId - edit thresholds only, never the stock count. */
export const updateThresholds = asyncHandler(async (req, res) => {
  const patch = { updated_by: req.user.id, last_updated: new Date().toISOString() };
  if (req.body.minimumStock !== undefined) patch.minimum_stock = req.body.minimumStock;
  if (req.body.reorderPoint !== undefined) patch.reorder_point = req.body.reorderPoint;
  if (req.body.location     !== undefined) patch.location      = req.body.location;

  const { data, error } = await supabaseAdmin
    .from('inventory').update(patch).eq('product_id', req.params.productId).select(SELECT).single();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw ApiError.notFound('Inventory record not found');

  await refreshAlertsForProduct(Number(req.params.productId));
  await logActivity(req.user.id, 'update_thresholds', 'inventory', req.params.productId, patch);
  ok(res, { ...data, stock_status: statusOf(data) });
});

/** POST /api/inventory/recheck-alerts */
export const recheckAlerts = asyncHandler(async (req, res) => {
  const count = await refreshAllAlerts();
  await logActivity(req.user.id, 'recheck_alerts', 'inventory', null, { products: count });
  ok(res, { message: `Re-evaluated alert rules for ${count} product(s).` });
});
