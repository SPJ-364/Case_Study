<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { movementsApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const toast = useToastStore();

const rows = ref([]);
const summary = ref({ byType: {}, shrinkage: { units: 0, value: 0 }, totalMovements: 0 });
const loading = ref(true);
const filters = reactive({ type: '', from: '', to: '' });

const when = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const load = async () => {
  loading.value = true;
  try {
    const [list, sum] = await Promise.all([
      movementsApi.list({ type: filters.type, from: filters.from || undefined, to: filters.to || undefined, limit: 200 }),
      movementsApi.summary({ from: filters.from || undefined, to: filters.to || undefined }),
    ]);
    rows.value = list.data;
    summary.value = sum;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

watch(() => [filters.type, filters.from, filters.to], load);
onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Movements" :value="summary.totalMovements" tone="blue" />
      <StatCard label="Stock In" :value="summary.byType?.stock_in?.units || 0" sublabel="units received" tone="green" />
      <StatCard label="Stock Out" :value="summary.byType?.stock_out?.units || 0" sublabel="units issued" tone="default" />
      <StatCard label="Shrinkage" :value="summary.shrinkage?.units || 0"
                :sublabel="`${peso(summary.shrinkage?.value)} — damaged + missing`" tone="red" />
    </div>

    <div class="card p-4 flex flex-wrap items-center gap-3">
      <select v-model="filters.type" class="select w-auto min-w-[170px]">
        <option value="">All movement types</option>
        <option value="stock_in">Stock In</option>
        <option value="stock_out">Stock Out</option>
        <option value="returned">Returned</option>
        <option value="damaged">Damaged</option>
        <option value="missing">Missing</option>
        <option value="adjustment">Adjustment</option>
      </select>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500">From</label>
        <input v-model="filters.from" type="date" class="input w-auto" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500">To</label>
        <input v-model="filters.to" type="date" class="input w-auto" />
      </div>
      <button class="btn-ghost btn-sm" @click="filters.type=''; filters.from=''; filters.to=''">Clear</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Stock Movement Ledger</h3>
        <span class="text-xs text-slate-400">{{ rows.length }} record(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Date &amp; Time</th><th>Product</th><th>Type</th>
              <th class="text-right">Quantity</th><th>Reason</th><th>Reference</th><th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7" class="text-center py-12 text-slate-400">Loading ledger…</td></tr>
            <tr v-else-if="!rows.length">
              <td colspan="7" class="text-center py-12 text-slate-400">
                No stock movements recorded for this period.
              </td>
            </tr>
            <tr v-else v-for="m in rows" :key="m.movement_id">
              <td class="text-xs text-slate-500 whitespace-nowrap">{{ when(m.date_recorded) }}</td>
              <td>
                <p class="font-medium text-slate-800">{{ m.product?.product_name }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ m.product?.sku }}</p>
              </td>
              <td><StatusBadge :status="m.movement_type" /></td>
              <td class="text-right font-semibold tabular-nums"
                  :class="['stock_in','returned'].includes(m.movement_type) ? 'text-emerald-600' : 'text-slate-800'">
                {{ ['stock_in','returned'].includes(m.movement_type) ? '+' : '' }}{{ m.quantity }}
              </td>
              <td class="text-slate-600 text-sm max-w-xs truncate">{{ m.reason || '—' }}</td>
              <td class="text-xs font-mono text-slate-500">{{ m.reference_no || '—' }}</td>
              <td class="text-sm text-slate-600">{{ m.recorded_by_user?.full_name || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
