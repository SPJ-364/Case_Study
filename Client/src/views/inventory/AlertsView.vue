<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { alertsApi, inventoryApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ModalDialog from '@/components/ui/ModalDialog.vue';

const auth = useAuthStore();
const toast = useToastStore();

const alerts = ref([]);
const summary = ref({ total: 0, byType: {}, byPriority: {} });
const loading = ref(true);
const busy = ref(false);

const filters = reactive({ status: 'active', type: '', priority: '', search: '' });

const detail = ref(null);
const detailOpen = ref(false);

const when = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const load = async () => {
  loading.value = true;
  try {
    const [list, sum] = await Promise.all([
      alertsApi.list({ ...filters }),
      alertsApi.summary(),
    ]);
    alerts.value = list.data;
    summary.value = sum;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

const setStatus = async (alert, status) => {
  busy.value = true;
  try {
    await alertsApi.setStatus(alert.alert_id, status);
    toast.success(status === 'resolved' ? 'Alert resolved.' : 'Alert acknowledged.');
    detailOpen.value = false;
    await load();
  } catch (e) { toast.error(e.message); }
  finally { busy.value = false; }
};

const recheck = async () => {
  busy.value = true;
  try {
    const res = await inventoryApi.recheckAlerts();
    toast.success(res.message);
    await load();
  } catch (e) { toast.error(e.message); }
  finally { busy.value = false; }
};

const openDetail = (a) => { detail.value = a; detailOpen.value = true; };

const byType = computed(() => summary.value.byType || {});

let t;
watch(() => filters.search, () => { clearTimeout(t); t = setTimeout(load, 350); });
watch(() => [filters.status, filters.type, filters.priority], load);

onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <!-- summary cards -->
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard label="Active Alerts" :value="summary.total" sublabel="Needing attention" tone="red" />
      <StatCard label="Low Stock" :value="byType.low_stock || 0" tone="amber" />
      <StatCard label="Out of Stock" :value="byType.out_of_stock || 0" tone="red" />
      <StatCard label="Reorder Due" :value="byType.reorder || 0" tone="blue" />
    </div>

    <!-- toolbar -->
    <div class="card p-4 flex flex-wrap items-center gap-3">
      <input v-model="filters.search" class="input flex-1 min-w-[200px]" placeholder="Search alerts…" />

      <select v-model="filters.status" class="select w-auto min-w-[140px]">
        <option value="active">Active</option>
        <option value="acknowledged">Acknowledged</option>
        <option value="resolved">Resolved</option>
        <option value="all">All statuses</option>
      </select>

      <select v-model="filters.type" class="select w-auto min-w-[150px]">
        <option value="">All types</option>
        <option value="low_stock">Low Stock</option>
        <option value="out_of_stock">Out of Stock</option>
        <option value="reorder">Reorder</option>
        <option value="missing_item">Missing Item</option>
        <option value="damaged_item">Damaged Item</option>
        <option value="near_expiry">Near Expiry</option>
      </select>

      <select v-model="filters.priority" class="select w-auto min-w-[130px]">
        <option value="">All priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <button v-if="auth.can('alerts.manage')" class="btn-ghost btn-sm ml-auto" :disabled="busy" @click="recheck">
        {{ busy ? 'Checking…' : 'Recheck rules' }}
      </button>
    </div>

    <!-- list -->
    <div class="card">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Type</th><th>Product</th><th>Message</th>
              <th class="text-right">Stock</th><th class="text-right">Reorder</th>
              <th>Priority</th><th>Status</th><th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="text-center py-12 text-slate-400">Loading alerts…</td></tr>
            <tr v-else-if="!alerts.length">
              <td colspan="8" class="text-center py-12 text-slate-400">
                No alerts match these filters. That is good news.
              </td>
            </tr>
            <tr v-else v-for="a in alerts" :key="a.alert_id">
              <td><StatusBadge :status="a.alert_type" /></td>
              <td>
                <p class="font-medium text-slate-800">{{ a.product?.product_name }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ a.product?.sku }}</p>
              </td>
              <td class="text-slate-600 max-w-sm">{{ a.alert_message }}</td>
              <td class="text-right font-semibold tabular-nums">{{ a.product?.inventory?.current_stock ?? '—' }}</td>
              <td class="text-right tabular-nums text-slate-500">{{ a.product?.inventory?.reorder_point ?? '—' }}</td>
              <td><StatusBadge :status="a.priority" /></td>
              <td><StatusBadge :status="a.alert_status" /></td>
              <td class="text-right whitespace-nowrap">
                <button class="btn-ghost btn-sm mr-1" @click="openDetail(a)">View</button>
                <button v-if="auth.can('alerts.manage') && a.alert_status === 'active'"
                        class="btn-ghost btn-sm" :disabled="busy" @click="setStatus(a, 'acknowledged')">Ack</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- detail -->
    <ModalDialog :open="detailOpen" title="Alert Details" @close="detailOpen = false">
      <div v-if="detail" class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <StatusBadge :status="detail.alert_type" />
          <StatusBadge :status="detail.priority" />
          <StatusBadge :status="detail.alert_status" />
        </div>

        <p class="text-sm text-slate-700">{{ detail.alert_message }}</p>

        <div class="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-slate-500">Product</span>
            <span class="font-medium">{{ detail.product?.product_name }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">SKU</span>
            <span class="font-mono text-xs">{{ detail.product?.sku }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Current stock</span>
            <span class="font-semibold">{{ detail.product?.inventory?.current_stock ?? '—' }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Reorder point</span>
            <span>{{ detail.product?.inventory?.reorder_point ?? '—' }}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Raised</span>
            <span>{{ when(detail.date_created) }}</span></div>
        </div>

        <div v-if="detail.product?.supplier" class="rounded-lg border border-slate-200 p-4">
          <p class="text-xs uppercase tracking-wider text-slate-400 mb-2">Supplier to contact</p>
          <p class="font-medium text-slate-800">{{ detail.product.supplier.supplier_name }}</p>
          <p class="text-sm text-slate-600">{{ detail.product.supplier.contact_person }}</p>
          <p class="text-sm text-slate-600">{{ detail.product.supplier.contact_number }}</p>
          <p class="text-sm text-slate-600">{{ detail.product.supplier.email }}</p>
        </div>
      </div>

      <template #footer>
        <button class="btn-ghost" @click="detailOpen = false">Close</button>
        <button v-if="auth.can('alerts.manage') && detail?.alert_status !== 'resolved'"
                class="btn-primary" :disabled="busy" @click="setStatus(detail, 'resolved')">
          Mark resolved
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
