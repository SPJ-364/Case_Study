import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';

/** GET /api/logs - the Super Admin system activity monitor. */
export const listLogs = asyncHandler(async (req, res) => {
  const { action, entityType, userId, limit = 100 } = req.query;

  let q = supabaseAdmin.from('activity_logs')
    .select('log_id, action, entity_type, entity_id, details, created_at, user:users ( user_id, full_name, role:roles ( role_code ) )')
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit) || 100, 500));

  if (action)     q = q.eq('action', action);
  if (entityType) q = q.eq('entity_type', entityType);
  if (userId)     q = q.eq('user_id', userId);

  const { data, error } = await q;
  if (error) throw new ApiError(500, error.message);
  ok(res, data, { total: data.length });
});
