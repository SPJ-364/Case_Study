<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import StatusBadge from '@/components/ui/StatusBadge.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const product = ref(null);
const loading = ref(true);

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const when = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const date = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '—');

onMounted(async () => {
  try { product.value = await productsApi.get(route.params.id); }
  catch (e) { toast.error(e.message); router.push('/inventory'); }
  finally { loading.value = false; }
});
</script>

<template>
  <div class="space-y-5">
    <button class="text-sm text-slate-500 hover:text-slate-800" @click="router.back()">&larr; Back</button>

    <div v-if="loading" class="text-center py-16 text-slate-400">Loading product…</div>

    <template v-else-if="product">
      <div class="card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900">{{ product.product_name }}</h2>
            <p class="text-sm text-slate-500 font-mono mt-0.5">{{ product.sku }}</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <StatusBadge :status="product.stock_status" />
              <span class="badge-gray">{{ product.category?.category_name || 'Uncategorised' }}</span>
              <span class="badge-gray">{{ product.status }}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500">Current stock</p>
            <p class="text-3xl font-bold text-slate-900 tabular-nums">{{ product.inventory?.current_stock ?? 0 }}</p>
            <p class="text-xs text-slate-400">{{ product.unit_of_measure }}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card lg:col-span-1">
          <div class="card-header"><h3 class="card-title">Details</h3></div>
          <div class="card-body space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-slate-500">Unit price</span>
              <span class="font-medium">{{ peso(product.unit_price) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Minimum stock</span>
              <span>{{ product.inventory?.minimum_stock ?? '—' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Reorder point</span>
              <span>{{ product.inventory?.reorder_point ?? '—' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Location</span>
              <span>{{ product.inventory?.location || '—' }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Expiration</span>
              <span>{{ date(product.expiration_date) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Last updated</span>
              <span class="text-xs">{{ product.inventory?.last_updated ? when(product.inventory.last_updated) : '—' }}</span></div>
          </div>
        </div>

        <div class="card lg:col-span-1">
          <div class="card-header"><h3 class="card-title">Supplier</h3></div>
          <div class="card-body">
            <template v-if="product.supplier">
              <p class="font-semibold text-slate-800">{{ product.supplier.supplier_name }}</p>
              <RouterLink :to="`/suppliers`" class="text-xs text-navy-600 hover:underline">View suppliers</RouterLink>
            </template>
            <p v-else class="text-sm text-slate-400">No supplier assigned.</p>
          </div>
        </div>

        <div class="card lg:col-span-1">
          <div class="card-header"><h3 class="card-title">Valuation</h3></div>
          <div class="card-body">
            <p class="text-xs text-slate-500">Stock value at current unit price</p>
            <p class="text-2xl font-bold text-slate-900 mt-1">
              {{ peso((product.inventory?.current_stock || 0) * Number(product.unit_price || 0)) }}
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Stock Movement History</h3>
          <RouterLink to="/movements" class="text-xs font-medium text-navy-600 hover:underline">Full ledger</RouterLink>
        </div>
        <div class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Date</th><th>Type</th><th class="text-right">Qty</th><th>Reason</th><th>Recorded By</th></tr></thead>
            <tbody>
              <tr v-if="!product.recentMovements?.length">
                <td colspan="5" class="text-center py-10 text-slate-400">No movements recorded for this product.</td>
              </tr>
              <tr v-else v-for="m in product.recentMovements" :key="m.movement_id">
                <td class="text-xs text-slate-500 whitespace-nowrap">{{ when(m.date_recorded) }}</td>
                <td><StatusBadge :status="m.movement_type" /></td>
                <td class="text-right font-semibold tabular-nums">{{ m.quantity }}</td>
                <td class="text-slate-600 text-sm">{{ m.reason || '—' }}</td>
                <td class="text-sm text-slate-600">{{ m.recorded_by?.full_name || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
