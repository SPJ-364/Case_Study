<script setup>
import { ref, onMounted, computed } from 'vue';
import { dashboardApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const auth = useAuthStore();
const toast = useToastStore();

const data = ref(null);
const loading = ref(true);

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num  = (n) => Number(n || 0).toLocaleString();
const when = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const cards   = computed(() => data.value?.cards ?? {});
const panels  = computed(() => data.value?.panels ?? {});

const priorityTotal = computed(() => {
  const p = panels.value.alertsByPriority || {};
  return (p.critical || 0) + (p.high || 0) + (p.medium || 0) + (p.low || 0);
});

const load = async () => {
  loading.value = true;
  try { data.value = await dashboardApi.get(); }
  catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <!-- header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-slate-900">{{ auth.roleName }} Dashboard</h2>
        <p class="text-sm text-slate-500">Welcome back, {{ auth.user?.fullName }}.</p>
      </div>
      <button class="btn-ghost btn-sm" :disabled="loading" @click="load">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-16 text-slate-400">Loading dashboard…</div>

    <template v-else>
      <!-- stat cards -->
      <div class="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard v-if="cards.totalProducts !== undefined"
                  label="Total Products" :value="num(cards.totalProducts)"
                  :sublabel="`${num(cards.totalQuantity)} units on hand`" tone="blue" />
        <StatCard v-if="cards.lowStock !== undefined"
                  label="Low Stock" :value="num(cards.lowStock)" sublabel="At or below minimum" tone="amber" />
        <StatCard v-if="cards.outOfStock !== undefined"
                  label="Out of Stock" :value="num(cards.outOfStock)" sublabel="Needs immediate restock" tone="red" />
        <StatCard v-if="cards.reorderDue !== undefined"
                  label="Reorder Due" :value="num(cards.reorderDue)" sublabel="At reorder point" tone="blue" />
        <StatCard v-if="cards.activeAlerts !== undefined"
                  label="Active Alerts" :value="num(cards.activeAlerts)" sublabel="Awaiting action" tone="red" />
        <StatCard v-if="cards.totalValue !== undefined"
                  label="Stock Value" :value="peso(cards.totalValue)" sublabel="Current inventory valuation" tone="green" />
        <StatCard v-if="cards.shrinkageUnits30d !== undefined"
                  label="Shrinkage (30d)" :value="num(cards.shrinkageUnits30d)"
                  :sublabel="`${peso(cards.shrinkageValue30d)} lost`" tone="amber" />
        <StatCard v-if="cards.activeSuppliers !== undefined"
                  label="Active Suppliers" :value="num(cards.activeSuppliers)" tone="default" />
        <StatCard v-if="cards.totalUsers !== undefined"
                  label="Active Users" :value="num(cards.totalUsers)" sublabel="Across all roles" tone="default" />
      </div>

      <!-- finance notice -->
      <div v-if="panels.financeNotice"
           class="card p-4 border-l-4 border-l-amber-400 bg-amber-50/50">
        <p class="text-sm font-semibold text-slate-800">Finance module — planned</p>
        <p class="text-sm text-slate-600 mt-1">{{ panels.financeNotice.message }}</p>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <!-- recent movements -->
        <div v-if="panels.recentMovements" class="card lg:col-span-2">
          <div class="card-header">
            <h3 class="card-title">Recent Stock Movements</h3>
            <RouterLink to="/movements" class="text-xs font-medium text-navy-600 hover:underline">View all</RouterLink>
          </div>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr><th>Date</th><th>Product</th><th>Type</th><th class="text-right">Qty</th><th>By</th></tr>
              </thead>
              <tbody>
                <tr v-if="!panels.recentMovements.length">
                  <td colspan="5" class="text-center py-8 text-slate-400">No movements recorded yet.</td>
                </tr>
                <tr v-for="m in panels.recentMovements" :key="m.movement_id">
                  <td class="text-xs text-slate-500 whitespace-nowrap">{{ when(m.date_recorded) }}</td>
                  <td>
                    <p class="font-medium text-slate-800">{{ m.product?.product_name }}</p>
                    <p class="text-xs text-slate-400">{{ m.product?.sku }}</p>
                  </td>
                  <td><StatusBadge :status="m.movement_type" /></td>
                  <td class="text-right font-semibold tabular-nums">{{ m.quantity }}</td>
                  <td class="text-xs text-slate-500">{{ m.recorded_by_user?.full_name || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- alerts by priority -->
        <div v-if="panels.alertsByPriority" class="card">
          <div class="card-header">
            <h3 class="card-title">Alerts by Priority</h3>
            <RouterLink to="/alerts" class="text-xs font-medium text-navy-600 hover:underline">View all</RouterLink>
          </div>
          <div class="card-body space-y-3">
            <div v-for="(count, level) in panels.alertsByPriority" :key="level">
              <div class="flex items-center justify-between text-sm mb-1">
                <StatusBadge :status="level" />
                <span class="font-semibold tabular-nums text-slate-700">{{ count }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full"
                     :class="{ 'bg-red-500': level === 'critical', 'bg-amber-500': level === 'high',
                               'bg-blue-500': level === 'medium', 'bg-slate-400': level === 'low' }"
                     :style="{ width: priorityTotal ? `${(count / priorityTotal) * 100}%` : '0%' }" />
              </div>
            </div>
            <p v-if="!priorityTotal" class="text-sm text-slate-400 text-center py-2">No active alerts.</p>
          </div>
        </div>

        <!-- low stock -->
        <div v-if="panels.lowStockItems" class="card lg:col-span-2">
          <div class="card-header">
            <h3 class="card-title">Items Needing Attention</h3>
            <RouterLink to="/inventory" class="text-xs font-medium text-navy-600 hover:underline">Open inventory</RouterLink>
          </div>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr><th>SKU</th><th>Product</th><th class="text-right">Stock</th><th class="text-right">Reorder</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-if="!panels.lowStockItems.length">
                  <td colspan="5" class="text-center py-8 text-slate-400">Everything is above its minimum level.</td>
                </tr>
                <tr v-for="it in panels.lowStockItems" :key="it.productId">
                  <td class="font-mono text-xs text-slate-500">{{ it.sku }}</td>
                  <td class="font-medium text-slate-800">{{ it.productName }}</td>
                  <td class="text-right font-semibold tabular-nums">{{ it.currentStock }}</td>
                  <td class="text-right tabular-nums text-slate-500">{{ it.reorderPoint }}</td>
                  <td><StatusBadge :status="it.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- users by role -->
        <div v-if="panels.usersByRole" class="card">
          <div class="card-header"><h3 class="card-title">Users by Role</h3></div>
          <div class="card-body space-y-2.5">
            <div v-for="r in panels.usersByRole" :key="r.roleCode"
                 class="flex items-center justify-between text-sm">
              <span class="text-slate-600">{{ r.roleName }}</span>
              <span class="badge-gray tabular-nums">{{ r.count }}</span>
            </div>
          </div>
        </div>

        <!-- recent activity -->
        <div v-if="panels.recentActivity" class="card lg:col-span-3">
          <div class="card-header">
            <h3 class="card-title">Recent System Activity</h3>
            <RouterLink to="/activity" class="text-xs font-medium text-navy-600 hover:underline">View log</RouterLink>
          </div>
          <div class="card-body space-y-2">
            <div v-if="!panels.recentActivity.length" class="text-sm text-slate-400 text-center py-4">
              No activity recorded yet.
            </div>
            <div v-for="log in panels.recentActivity" :key="log.log_id"
                 class="flex items-center gap-3 text-sm py-1.5 border-b border-slate-50 last:border-0">
              <span class="badge-gray shrink-0">{{ log.action.replace(/_/g, ' ') }}</span>
              <span class="text-slate-600 truncate">{{ log.user?.full_name || 'System' }}</span>
              <span class="text-xs text-slate-400 ml-auto whitespace-nowrap">{{ when(log.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
