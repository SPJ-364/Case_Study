import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { logActivity } from '../services/activityLog.service.js';

const SELECT = `
  alert_id, alert_type, alert_message, alert_status, priority, date_created, resolved_at,
  product:products (
    product_id, product_name, sku,
    supplier:suppliers ( supplier_id, supplier_name, contact_person, contact_number, email ),
    inventory ( current_stock, minimum_stock, reorder_point )
  ),
  resolved_by_user:users!alerts_resolved_by_fkey ( full_name )
`;

/** GET /api/alerts */
export const listAlerts = asyncHandler(async (req, res) => {
  const { status = 'active', type, priority, search } = req.query;

  let q = supabaseAdmin.from('alerts').select(SELECT)
    .order('priority', { ascending: false })
    .order('date_created', { ascending: false });

  if (status !== 'all') q = q.eq('alert_status', status);
  if (type)     q = q.eq('alert_type', type);
  if (priority) q = q.eq('priority', priority);

  const { data, error } = await q;
  if (error) throw new ApiError(500, error.message);

  let rows = data.map((a) => ({
    ...a,
    product: a.product
      ? { ...a.product, inventory: Array.isArray(a.product.inventory) ? a.product.inventory[0] : a.product.inventory }
      : null,
  }));

  if (search) {
    const s = String(search).toLowerCase();
    rows = rows.filter((a) =>
      a.product?.product_name?.toLowerCase().includes(s) ||
      a.product?.sku?.toLowerCase().includes(s) ||
      a.alert_message.toLowerCase().includes(s));
  }

  ok(res, rows, { total: rows.length });
});

/** GET /api/alerts/summary - counts for the alert dashboard cards and donut. */
export const alertSummary = asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('alerts').select('alert_type, priority, alert_status').eq('alert_status', 'active');
  if (error) throw new ApiError(500, error.message);

  const byType = {}, byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const a of data) {
    byType[a.alert_type] = (byType[a.alert_type] || 0) + 1;
    byPriority[a.priority] = (byPriority[a.priority] || 0) + 1;
  }
  ok(res, { total: data.length, byType, byPriority });
});

export const alertStatusSchema = z.object({
  status: z.enum(['acknowledged', 'resolved']),
  note: z.string().optional().nullable(),
});

/** PATCH /api/alerts/:id */
export const updateAlertStatus = asyncHandler(async (req, res) => {
  const patch = { alert_status: req.body.status };
  if (req.body.status === 'resolved') {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = req.user.id;
  }

  const { data, error } = await supabaseAdmin
    .from('alerts').update(patch).eq('alert_id', req.params.id).select(SELECT).single();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw ApiError.notFound('Alert not found');

  await logActivity(req.user.id, `alert_${req.body.status}`, 'alerts', req.params.id, {
    note: req.body.note ?? null,
  });
  ok(res, data);
});
