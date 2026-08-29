import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';

const statusOf = (r) => {
  if (r.current_stock === 0) return 'out_of_stock';
  if (r.current_stock <= r.minimum_stock) return 'low_stock';
  if (r.current_stock <= r.reorder_point) return 'reorder';
  return 'in_stock';
};

/**
 * GET /api/dashboard
 * Returns a payload shaped to the caller's role, so each admin area sees the
 * cards its own responsibilities need rather than one generic dashboard.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const roleCode = req.user.role.role_code;
  const perms = req.user.permissions;

  const payload = { role: roleCode, generatedAt: new Date().toISOString(), cards: {}, panels: {} };

  /* ---------------------------------------------------- inventory-side data */
  if (perms.includes('inventory.view')) {
    const { data: inv, error } = await supabaseAdmin
      .from('inventory')
      .select('current_stock, minimum_stock, reorder_point, product:products ( product_id, product_name, sku, unit_price )');
    if (error) throw new ApiError(500, error.message);

    const rows = inv.filter((r) => r.product).map((r) => ({ ...r, stock_status: statusOf(r) }));

    payload.cards.totalProducts = rows.length;
    payload.cards.totalQuantity = rows.reduce((s, r) => s + r.current_stock, 0);
    payload.cards.totalValue = Number(
      rows.reduce((s, r) => s + r.current_stock * Number(r.product.unit_price || 0), 0).toFixed(2));
    payload.cards.lowStock   = rows.filter((r) => r.stock_status === 'low_stock').length;
    payload.cards.outOfStock = rows.filter((r) => r.stock_status === 'out_of_stock').length;
    payload.cards.reorderDue = rows.filter((r) => r.stock_status === 'reorder').length;

    payload.panels.lowStockItems = rows
      .filter((r) => r.stock_status === 'low_stock' || r.stock_status === 'out_of_stock')
      .sort((a, b) => a.current_stock - b.current_stock)
      .slice(0, 8)
      .map((r) => ({
        productId: r.product.product_id,
        productName: r.product.product_name,
        sku: r.product.sku,
        currentStock: r.current_stock,
        reorderPoint: r.reorder_point,
        status: r.stock_status,
      }));
  }

  /* ------------------------------------------------------------------ alerts */
  if (perms.includes('alerts.view')) {
    const { data: alerts } = await supabaseAdmin
      .from('alerts')
      .select('alert_id, alert_type, alert_message, priority, date_created, product:products ( product_name, sku )')
      .eq('alert_status', 'active')
      .order('priority', { ascending: false })
      .order('date_created', { ascending: false });

    const list = alerts || [];
    payload.cards.activeAlerts = list.length;
    payload.panels.alertsByPriority = list.reduce(
      (acc, a) => { acc[a.priority] = (acc[a.priority] || 0) + 1; return acc; },
      { critical: 0, high: 0, medium: 0, low: 0 });
    payload.panels.recentAlerts = list.slice(0, 6);
  }

  /* -------------------------------------------------------- stock movements */
  if (perms.includes('movements.view')) {
    const { data: movements } = await supabaseAdmin
      .from('stock_movements')
      .select('movement_id, movement_type, quantity, date_recorded, product:products ( product_name, sku ), recorded_by_user:users!stock_movements_recorded_by_fkey ( full_name )')
      .order('date_recorded', { ascending: false })
      .limit(8);
    payload.panels.recentMovements = movements || [];

    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data: shrink } = await supabaseAdmin
      .from('stock_movements')
      .select('quantity, movement_type, product:products ( unit_price )')
      .in('movement_type', ['damaged', 'missing'])
      .gte('date_recorded', since);

    payload.cards.shrinkageUnits30d = (shrink || []).reduce((s, m) => s + Math.abs(m.quantity), 0);
    payload.cards.shrinkageValue30d = Number((shrink || [])
      .reduce((s, m) => s + Math.abs(m.quantity) * Number(m.product?.unit_price || 0), 0).toFixed(2));
  }

  /* ----------------------------------------------------------- system / users */
  if (perms.includes('users.view')) {
    const { count: totalUsers } = await supabaseAdmin
      .from('users').select('user_id', { count: 'exact', head: true }).eq('is_active', true);
    payload.cards.totalUsers = totalUsers ?? 0;

    const { data: roles } = await supabaseAdmin.from('roles').select('role_id, role_code, role_name');
    const { data: users } = await supabaseAdmin.from('users').select('role_id').eq('is_active', true);
    payload.panels.usersByRole = (roles || []).map((r) => ({
      roleCode: r.role_code,
      roleName: r.role_name,
      count: (users || []).filter((u) => u.role_id === r.role_id).length,
    }));
  }

  if (perms.includes('logs.view')) {
    const { data: logs } = await supabaseAdmin
      .from('activity_logs')
      .select('log_id, action, entity_type, entity_id, created_at, user:users ( full_name )')
      .order('created_at', { ascending: false })
      .limit(8);
    payload.panels.recentActivity = logs || [];
  }

  if (perms.includes('suppliers.view')) {
    const { count } = await supabaseAdmin
      .from('suppliers').select('supplier_id', { count: 'exact', head: true }).eq('is_active', true);
    payload.cards.activeSuppliers = count ?? 0;
  }

  /* ------------------------------------------------------------------ finance */
  if (perms.includes('finance.view')) {
    // Sales and transactions are scheduled for the finals phase. The card is
    // returned as a declared placeholder so the Finance dashboard is honest
    // about what is not built yet rather than showing invented numbers.
    payload.panels.financeNotice = {
      status: 'planned',
      message: 'Sales and transaction management is scheduled for the finals phase. Inventory valuation below is live.',
    };
  }

  ok(res, payload);
});
