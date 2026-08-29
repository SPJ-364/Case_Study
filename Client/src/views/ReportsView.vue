<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { inventoryApi, movementsApi, alertsApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const toast = useToastStore();

const summary = ref({});
const movementSummary = ref({ byType: {}, shrinkage: { units: 0, value: 0 } });
const alertSummary = ref({ total: 0, byType: {} });
const inventoryRows = ref([]);
const loading = ref(true);

const range = reactive({ from: '', to: '' });
const reportType = ref('stock_overview');

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const num  = (n) => Number(n || 0).toLocaleString();

/** Groups current stock value by category, for the bar chart. */
const byCategory = computed(() => {
  const map = {};
  for (const r of inventoryRows.value) {
    const key = r.product?.category?.category_name || 'Uncategorised';
    map[key] ||= { name: key, quantity: 0, value: 0, items: 0 };
    map[key].quantity += r.current_stock;
    map[key].value += r.current_stock * Number(r.product?.unit_price || 0);
    map[key].items += 1;
  }
  return Object.values(map).sort((a, b) => b.value - a.value);
});

const maxCategoryValue = computed(() => Math.max(1, ...byCategory.value.map((c) => c.value)));

const lowStockRows = computed(() =>
  inventoryRows.value
    .filter((r) => ['low_stock', 'out_of_stock', 'reorder'].includes(r.stock_status))
    .sort((a, b) => a.current_stock - b.current_stock));

const load = async () => {
  loading.value = true;
  try {
    const [sum, inv, mov, alr] = await Promise.all([
      inventoryApi.summary(),
      inventoryApi.list({}),
      movementsApi.summary({ from: range.from || undefined, to: range.to || undefined }),
      alertsApi.summary(),
    ]);
    summary.value = sum;
    inventoryRows.value = inv.data;
    movementSummary.value = mov;
    alertSummary.value = alr;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

/** Exports the visible report as CSV — no library, no server round trip. */
const exportCsv = () => {
  let headers, lines, name;

  if (reportType.value === 'low_stock') {
    name = 'low-stock-report';
    headers = ['SKU', 'Product', 'Category', 'Current Stock', 'Minimum', 'Reorder Point', 'Status'];
    lines = lowStockRows.value.map((r) => [
      r.product.sku, r.product.product_name, r.product.category?.category_name || '',
      r.current_stock, r.minimum_stock, r.reorder_point, r.stock_status,
    ]);
  } else if (reportType.value === 'category') {
    name = 'category-valuation';
    headers = ['Category', 'Items', 'Quantity', 'Stock Value'];
    lines = byCategory.value.map((c) => [c.name, c.items, c.quantity, c.value.toFixed(2)]);
  } else {
    name = 'stock-overview';
    headers = ['SKU', 'Product', 'Category', 'Supplier', 'Stock', 'Unit Price', 'Stock Value', 'Status'];
    lines = inventoryRows.value.map((r) => [
      r.product.sku, r.product.product_name,
      r.product.category?.category_name || '', r.product.supplier?.supplier_name || '',
      r.current_stock, Number(r.product.unit_price).toFixed(2),
      (r.current_stock * Number(r.product.unit_price || 0)).toFixed(2), r.stock_status,
    ]);
  }

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...lines].map((row) => row.map(esc).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Report exported.');
};

watch(() => [range.from, range.to], load);
onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-4 grid-cols-2 lg:grid-cols-5">
      <StatCard label="Stock Value" :value="peso(summary.totalValue)" tone="green" />
      <StatCard label="Total Products" :value="num(summary.totalProducts)"
                :sublabel="`${num(summary.totalQuantity)} units`" tone="blue" />
      <StatCard label="Low Stock" :value="num(summary.lowStock)" tone="amber" />
      <StatCard label="Out of Stock" :value="num(summary.outOfStock)" tone="red" />
      <StatCard label="Active Alerts" :value="num(alertSummary.total)" tone="red" />
    </div>

    <div class="card p-4 flex flex-wrap items-center gap-3">
      <select v-model="reportType" class="select w-auto min-w-[190px]">
        <option value="stock_overview">Stock Overview</option>
        <option value="low_stock">Low Stock Report</option>
        <option value="category">Category Valuation</option>
      </select>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500">From</label>
        <input v-model="range.from" type="date" class="input w-auto" />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500">To</label>
        <input v-model="range.to" type="date" class="input w-auto" />
      </div>
      <button class="btn-primary btn-sm ml-auto" @click="exportCsv">Export CSV</button>
    </div>

    <div v-if="loading" class="text-center py-16 text-slate-400">Building report…</div>

    <template v-else>
      <!-- category valuation chart -->
      <div class="card">
        <div class="card-header"><h3 class="card-title">Stock Value by Category</h3></div>
        <div class="card-body space-y-3">
          <div v-if="!byCategory.length" class="text-sm text-slate-400 text-center py-6">No inventory to chart.</div>
          <div v-for="c in byCategory" :key="c.name">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="text-slate-700 font-medium">{{ c.name }}</span>
              <span class="text-slate-500 tabular-nums">{{ peso(c.value) }} · {{ c.quantity }} units</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-navy-700"
                   :style="{ width: `${(c.value / maxCategoryValue) * 100}%` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- shrinkage -->
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card lg:col-span-1">
          <div class="card-header"><h3 class="card-title">Shrinkage Summary</h3></div>
          <div class="card-body space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-slate-500">Damaged units</span>
              <span class="font-semibold">{{ movementSummary.byType?.damaged?.units || 0 }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Missing units</span>
              <span class="font-semibold">{{ movementSummary.byType?.missing?.units || 0 }}</span></div>
            <div class="flex justify-between pt-2 border-t border-slate-100">
              <span class="text-slate-700 font-medium">Estimated loss</span>
              <span class="font-bold text-red-600">{{ peso(movementSummary.shrinkage?.value) }}</span>
            </div>
            <p class="text-[11px] text-slate-400 pt-1">
              Calculated from recorded damaged and missing movements at current unit price.
            </p>
          </div>
        </div>

        <div class="card lg:col-span-2">
          <div class="card-header">
            <h3 class="card-title">
              {{ reportType === 'low_stock' ? 'Items Below Threshold' : 'Stock Overview' }}
            </h3>
            <span class="text-xs text-slate-400">
              {{ (reportType === 'low_stock' ? lowStockRows : inventoryRows).length }} row(s)
            </span>
          </div>
          <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="table">
              <thead class="sticky top-0">
                <tr>
                  <th>SKU</th><th>Product</th><th class="text-right">Stock</th>
                  <th class="text-right">Value</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in (reportType === 'low_stock' ? lowStockRows : inventoryRows)" :key="r.inventory_id">
                  <td class="font-mono text-xs text-slate-500">{{ r.product.sku }}</td>
                  <td class="font-medium text-slate-800">{{ r.product.product_name }}</td>
                  <td class="text-right font-semibold tabular-nums">{{ r.current_stock }}</td>
                  <td class="text-right tabular-nums text-slate-600">
                    {{ peso(r.current_stock * Number(r.product.unit_price || 0)) }}
                  </td>
                  <td><StatusBadge :status="r.stock_status" /></td>
                </tr>
                <tr v-if="!(reportType === 'low_stock' ? lowStockRows : inventoryRows).length">
                  <td colspan="5" class="text-center py-10 text-slate-400">Nothing to show.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
