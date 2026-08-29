import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/respond.js';
import { logActivity } from '../services/activityLog.service.js';

const SELECT = `
  movement_id, movement_type, quantity, reason, reference_no, date_recorded,
  product:products ( product_id, product_name, sku ),
  recorded_by_user:users!stock_movements_recorded_by_fkey ( user_id, full_name )
`;

export const movementSchema = z.object({
  productId: z.coerce.number().int().positive(),
  movementType: z.enum(['stock_in', 'stock_out', 'damaged', 'missing', 'returned', 'adjustment']),
  quantity: z.coerce.number().int(),
  reason: z.string().optional().nullable(),
  referenceNo: z.string().optional().nullable(),
}).refine(
  (v) => (v.movementType === 'adjustment' ? v.quantity !== 0 : v.quantity > 0),
  { message: 'Quantity must be greater than 0 (adjustments may be negative but not zero)', path: ['quantity'] },
);

/** GET /api/movements - the stock movement ledger. */
export const listMovements = asyncHandler(async (req, res) => {
  const { productId, type, from, to, limit = 100 } = req.query;

  let q = supabaseAdmin.from('stock_movements').select(SELECT)
    .order('date_recorded', { ascending: false })
    .limit(Math.min(Number(limit) || 100, 500));

  if (productId) q = q.eq('product_id', productId);
  if (type)      q = q.eq('movement_type', type);
  if (from)      q = q.gte('date_recorded', from);
  if (to)        q = q.lte('date_recorded', to);

  const { data, error } = await q;
  if (error) throw new ApiError(500, error.message);
  ok(res, data, { total: data.length });
});

/**
 * POST /api/movements
 * The single entry point for changing stock. The database trigger applies the
 * delta to inventory and re-evaluates alerts, so stock can never drift from
 * the ledger and every change is attributable to a user.
 */
export const createMovement = asyncHandler(async (req, res) => {
  const { productId, movementType, quantity, reason, referenceNo } = req.body;

  const { data: product } = await supabaseAdmin
    .from('products').select('product_id, product_name').eq('product_id', productId).single();
  if (!product) throw ApiError.notFound('Product not found');

  const { data, error } = await supabaseAdmin.from('stock_movements').insert({
    product_id: productId,
    movement_type: movementType,
    quantity,
    reason: reason ?? null,
    reference_no: referenceNo ?? null,
    recorded_by: req.user.id,
  }).select(SELECT).single();

  if (error) {
    // The trigger raises this when a movement would push stock below zero.
    if (/Insufficient stock/i.test(error.message)) throw ApiError.badRequest(error.message);
    if (/No inventory record/i.test(error.message)) {
      throw ApiError.badRequest('This product has no inventory record yet.');
    }
    throw new ApiError(500, error.message);
  }

  const { data: inv } = await supabaseAdmin
    .from('inventory').select('current_stock, minimum_stock, reorder_point')
    .eq('product_id', productId).single();

  await logActivity(req.user.id, 'record_movement', 'stock_movements', data.movement_id, {
    product: product.product_name, movementType, quantity,
  });

  created(res, { ...data, inventory: inv });
});

/** GET /api/movements/summary - totals by type, for the shrinkage report. */
export const movementSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  let q = supabaseAdmin.from('stock_movements')
    .select('movement_type, quantity, product:products ( unit_price )');
  if (from) q = q.gte('date_recorded', from);
  if (to)   q = q.lte('date_recorded', to);

  const { data, error } = await q;
  if (error) throw new ApiError(500, error.message);

  const byType = {};
  let shrinkageUnits = 0;
  let shrinkageValue = 0;

  for (const m of data) {
    byType[m.movement_type] ||= { count: 0, units: 0 };
    byType[m.movement_type].count += 1;
    byType[m.movement_type].units += Math.abs(m.quantity);
    if (m.movement_type === 'damaged' || m.movement_type === 'missing') {
      shrinkageUnits += Math.abs(m.quantity);
      shrinkageValue += Math.abs(m.quantity) * Number(m.product?.unit_price || 0);
    }
  }

  ok(res, {
    byType,
    shrinkage: { units: shrinkageUnits, value: Number(shrinkageValue.toFixed(2)) },
    totalMovements: data.length,
  });
});
