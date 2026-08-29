import { supabaseAdmin } from '../config/supabase.js';

/**
 * Asks the database to re-evaluate every alert rule for a product.
 * The rules themselves live in the SQL function refresh_product_alerts()
 * so that alerts stay correct even if a row is changed outside this API.
 */
export const refreshAlertsForProduct = async (productId) => {
  const { error } = await supabaseAdmin.rpc('refresh_product_alerts', {
    p_product_id: productId,
  });
  if (error) console.warn('[alerts] refresh failed:', error.message);
};

/** Re-evaluates every product. Used by the "Recheck alerts" action. */
export const refreshAllAlerts = async () => {
  const { data, error } = await supabaseAdmin.from('inventory').select('product_id');
  if (error) throw error;
  await Promise.all((data || []).map((r) => refreshAlertsForProduct(r.product_id)));
  return data?.length ?? 0;
};
