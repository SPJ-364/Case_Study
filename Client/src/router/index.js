import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/**
 * meta.permission  - a single permission code required to enter the route
 * meta.anyOf       - array; at least one is required
 * meta.public      - route is reachable while signed out
 */
const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true, layout: 'blank' } },

  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Dashboard' } },

  { path: '/inventory', name: 'inventory', component: () => import('@/views/inventory/InventoryView.vue'),
    meta: { title: 'Inventory Management', permission: 'inventory.view' } },
  { path: '/inventory/:id', name: 'product-detail', component: () => import('@/views/inventory/ProductDetailView.vue'),
    meta: { title: 'Product Details', permission: 'products.view' } },

  { path: '/movements', name: 'movements', component: () => import('@/views/inventory/MovementsView.vue'),
    meta: { title: 'Stock Movements', permission: 'movements.view' } },

  { path: '/alerts', name: 'alerts', component: () => import('@/views/inventory/AlertsView.vue'),
    meta: { title: 'Alerts & Reorder', permission: 'alerts.view' } },

  { path: '/suppliers', name: 'suppliers', component: () => import('@/views/inventory/SuppliersView.vue'),
    meta: { title: 'Suppliers', permission: 'suppliers.view' } },

  { path: '/reports', name: 'reports', component: () => import('@/views/ReportsView.vue'),
    meta: { title: 'Reports & Insights', permission: 'reports.view' } },

  { path: '/users', name: 'users', component: () => import('@/views/admin/UsersView.vue'),
    meta: { title: 'User Management', permission: 'users.view' } },
  { path: '/roles', name: 'roles', component: () => import('@/views/admin/RolesView.vue'),
    meta: { title: 'Roles & Permissions', permission: 'roles.manage' } },
  { path: '/activity', name: 'activity', component: () => import('@/views/admin/ActivityLogView.vue'),
    meta: { title: 'System Activity', permission: 'logs.view' } },

  { path: '/finance', name: 'finance', component: () => import('@/views/FinanceView.vue'),
    meta: { title: 'Financial Records', permission: 'finance.view' } },
  { path: '/staff', name: 'staff', component: () => import('@/views/StaffView.vue'),
    meta: { title: 'Staff Management', permission: 'staff.view' } },

  { path: '/forbidden', name: 'forbidden', component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: 'Access Denied' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Page Not Found' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    // already signed in? skip the login page
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' };
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.permission && !auth.can(to.meta.permission)) return { name: 'forbidden' };
  if (to.meta.anyOf && !auth.canAny(...to.meta.anyOf))     return { name: 'forbidden' };

  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} — Inventory Management System`
    : 'Inventory Management System';
});

export default router;
