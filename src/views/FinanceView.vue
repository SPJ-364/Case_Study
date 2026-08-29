<script setup>
import { ref, onMounted, computed } from 'vue';
import { inventoryApi, movementsApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import StatCard from '@/components/ui/StatCard.vue';

const toast = useToastStore();
const summary = ref({});
const rows = ref([]);
const movementSummary = ref({ shrinkage: { units: 0, value: 0 } });
const loading = ref(true);

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const topByValue = computed(() =>
  [...rows.value]
    .map((r) => ({ ...r, value: r.current_stock * Number(r.product?.unit_price || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10));

onMounted(async () => {
  try {
    const [sum, inv, mov] = await Promise.all([
      inventoryApi.summary(), inventoryApi.list({}), movementsApi.summary({}),
    ]);
    summary.value = sum;
    rows.value = inv.data;
    movementSummary.value = mov;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
});
</script>

<template>
  <div class="space-y-5">
    <!-- Honest scope note rather than fabricated sales figures. -->
    <div class="card p-4 border-l-4 border-l-amber-400 bg-amber-50/50">
      <p class="text-sm font-semibold text-slate-800">Finance Admin — partial scope</p>
      <p class="text-sm text-slate-600 mt-1">
        Inventory valuation and shrinkage cost below are live from the database.
        <span class="font-medium">Sales and transaction management, financial records and
        advanced financial reports</span> are scheduled for the finals phase — they need
        <code class="text-xs bg-white px-1 py-0.5 rounded">transactions</code> and
        <code class="text-xs bg-white px-1 py-0.5 rounded">sales</code> tables that the prelim
        data architecture did not yet define.
      </p>
    </div>

    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard label="Inventory Valuation" :value="peso(summary.totalValue)" sublabel="At current unit prices" tone="green" />
      <StatCard label="Total Units" :value="Number(summary.totalQuantity || 0).toLocaleString()" tone="blue" />
      <StatCard label="Capital in Low Stock" :value="summary.lowStock || 0" sublabel="Items at risk of stockout" tone="amber" />
      <StatCard label="Shrinkage Loss" :value="peso(movementSummary.shrinkage?.value)"
                :sublabel="`${movementSummary.shrinkage?.units || 0} units written off`" tone="red" />
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Highest-Value Inventory Holdings</h3>
        <RouterLink to="/reports" class="text-xs font-medium text-navy-600 hover:underline">Full report</RouterLink>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr><th>SKU</th><th>Product</th><th class="text-right">Units</th>
                <th class="text-right">Unit Price</th><th class="text-right">Total Value</th></tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center py-12 text-slate-400">Loading…</td></tr>
            <tr v-else-if="!topByValue.length"><td colspan="5" class="text-center py-12 text-slate-400">No inventory recorded.</td></tr>
            <tr v-else v-for="r in topByValue" :key="r.inventory_id">
              <td class="font-mono text-xs text-slate-500">{{ r.product.sku }}</td>
              <td class="font-medium text-slate-800">{{ r.product.product_name }}</td>
              <td class="text-right tabular-nums">{{ r.current_stock }}</td>
              <td class="text-right tabular-nums text-slate-600">{{ peso(r.product.unit_price) }}</td>
              <td class="text-right tabular-nums font-semibold">{{ peso(r.value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
