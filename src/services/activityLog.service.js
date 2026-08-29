import { supabaseAdmin } from '../config/supabase.js';

/**
 * Writes an audit row. Never throws - logging must not break the request.
 * Backs the Super Admin responsibility "Monitor overall system activities".
 */
export const logActivity = async (userId, action, entityType, entityId, details = null) => {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: userId ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId != null ? String(entityId) : null,
      details,
    });
  } catch (err) {
    console.warn('[activity-log] failed:', err.message);
  }
};
