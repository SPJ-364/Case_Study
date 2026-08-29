<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { inventoryApi, productsApi, categoriesApi, suppliersApi, movementsApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ModalDialog from '@/components/ui/ModalDialog.vue';

const auth = useAuthStore();
const toast = useToastStore();

const rows = ref([]);
const categories = ref([]);
const suppliers = ref([]);
const loading = ref(true);

const filters = reactive({ search: '', status: '', categoryId: '' });

/* ------------------------------------------------------------ product form */
const productModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const form = reactive({
  productName: '', sku: '', categoryId: '', supplierId: '',
  unitPrice: 0, unitOfMeasure: 'pc', expirationDate: '',
  currentStock: 0, minimumStock: 0, reorderPoint: 0, location: 'Main Warehouse',
});
const formErrors = ref([]);

const resetForm = () => {
  Object.assign(form, {
    productName: '', sku: '', categoryId: '', supplierId: '',
    unitPrice: 0, unitOfMeasure: 'pc', expirationDate: '',
    currentStock: 0, minimumStock: 0, reorderPoint: 0, location: 'Main Warehouse',
  });
  formErrors.value = [];
  editingId.value = null;
};

const openCreate = () => { resetForm(); productModal.value = true; };

const openEdit = (row) => {
  resetForm();
  editingId.value = row.product.product_id;
  Object.assign(form, {
    productName: row.product.product_name,
    sku: row.product.sku,
    categoryId: row.product.category?.category_id ?? '',
    supplierId: row.product.supplier?.supplier_id ?? '',
    unitPrice: Number(row.product.unit_price),
    expirationDate: row.product.expiration_date ?? '',
    currentStock: row.current_stock,
    minimumStock: row.minimum_stock,
    reorderPoint: row.reorder_point,
    location: row.location ?? 'Main Warehouse',
  });
  productModal.value = true;
};

const saveProduct = async () => {
  saving.value = true;
  formErrors.value = [];
  try {
    const payload = {
      productName: form.productName,
      sku: form.sku,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      unitPrice: Number(form.unitPrice),
      unitOfMeasure: form.unitOfMeasure,
      expirationDate: form.expirationDate || null,
      minimumStock: Number(form.minimumStock),
      reorderPoint: Number(form.reorderPoint),
      location: form.location,
    };
    if (editingId.value) {
      await productsApi.update(editingId.value, payload);
      toast.success('Product updated.');
    } else {
      await productsApi.create({ ...payload, currentStock: Number(form.currentStock) });
      toast.success('Product added.');
    }
    productModal.value = false;
    await load();
  } catch (e) {
    formErrors.value = e.details?.map((d) => `${d.field}: ${d.message}`) ?? [e.message];
  } finally {
    saving.value = false;
  }
};

const removeProduct = async (row) => {
  if (!confirm(`Delete "${row.product.product_name}"? Its stock movement history will be removed too.`)) return;
  try {
    await productsApi.remove(row.product.product_id);
    toast.success('Product deleted.');
    await load();
  } catch (e) { toast.error(e.message); }
};

/* ---------------------------------------------------------- stock movement */
const moveModal = ref(false);
const moveTarget = ref(null);
const moveForm = reactive({ movementType: 'stock_in', quantity: 1, reason: '', referenceNo: '' });
const moveError = ref('');

const openMovement = (row) => {
  moveTarget.value = row;
  Object.assign(moveForm, { movementType: 'stock_in', quantity: 1, reason: '', referenceNo: '' });
  moveError.value = '';
  moveModal.value = true;
};

const submitMovement = async () => {
  saving.value = true;
  moveError.value = '';
  try {
    await movementsApi.create({
      productId: moveTarget.value.product.product_id,
      movementType: moveForm.movementType,
      quantity: Number(moveForm.quantity),
      reason: moveForm.reason || null,
      referenceNo: moveForm.referenceNo || null,
    });
    toast.success('Stock movement recorded.');
    moveModal.value = false;
    await load();
  } catch (e) {
    moveError.value = e.message;
  } finally {
    saving.value = false;
  }
};

/* ------------------------------------------------------------------- load */
const load = async () => {
  loading.value = true;
  try {
    const res = await inventoryApi.list({
      search: filters.search, status: filters.status, categoryId: filters.categoryId,
    });
    rows.value = res.data;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const counts = computed(() => ({
  all: rows.value.length,
  low: rows.value.filter((r) => r.stock_status === 'low_stock').length,
  out: rows.value.filter((r) => r.stock_status === 'out_of_stock').length,
}));

let t;
watch(() => filters.search, () => { clearTimeout(t); t = setTimeout(load, 350); });
watch(() => [filters.status, filters.categoryId], load);

onMounted(async () => {
  await load();
  try {
    categories.value = await categoriesApi.list();
    if (auth.can('suppliers.view')) suppliers.value = await suppliersApi.list({ active: 'true' });
  } catch { /* filters simply stay empty */ }
});
</script>

<template>
  <div class="space-y-5">
    <!-- toolbar -->
    <div class="card p-4">
      <div class="flex flex-wrap items-center gap-3">
        <input v-model="filters.search" class="input flex-1 min-w-[200px]"
               placeholder="Search product name or SKU…" />

        <select v-model="filters.status" class="select w-auto min-w-[150px]">
          <option value="">All statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="reorder">Reorder Due</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        <select v-model="filters.categoryId" class="select w-auto min-w-[150px]">
          <option value="">All categories</option>
          <option v-for="c in categories" :key="c.category_id" :value="c.category_id">
            {{ c.category_name }}
          </option>
        </select>

        <button v-if="auth.can('products.create')" class="btn-primary btn-sm ml-auto" @click="openCreate">
          + Add Product
        </button>
      </div>

      <div class="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span>{{ counts.all }} item(s)</span>
        <span class="text-amber-600">{{ counts.low }} low</span>
        <span class="text-red-600">{{ counts.out }} out of stock</span>
      </div>
    </div>

    <!-- table -->
    <div class="card">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Supplier</th>
              <th class="text-right">Stock</th><th class="text-right">Min</th><th class="text-right">Reorder</th>
              <th class="text-right">Unit Price</th><th>Status</th><th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="9" class="text-center py-12 text-slate-400">Loading inventory…</td></tr>
            <tr v-else-if="!rows.length"><td colspan="9" class="text-center py-12 text-slate-400">No inventory records match these filters.</td></tr>
            <tr v-else v-for="r in rows" :key="r.inventory_id">
              <td>
                <RouterLink :to="`/inventory/${r.product.product_id}`" class="font-medium text-slate-800 hover:text-navy-600 hover:underline">
                  {{ r.product.product_name }}
                </RouterLink>
                <p class="text-xs text-slate-400 font-mono">{{ r.product.sku }}</p>
              </td>
              <td class="text-slate-600">{{ r.product.category?.category_name || '—' }}</td>
              <td class="text-slate-600">{{ r.product.supplier?.supplier_name || '—' }}</td>
              <td class="text-right font-semibold tabular-nums">{{ r.current_stock }}</td>
              <td class="text-right tabular-nums text-slate-500">{{ r.minimum_stock }}</td>
              <td class="text-right tabular-nums text-slate-500">{{ r.reorder_point }}</td>
              <td class="text-right tabular-nums text-slate-600">{{ peso(r.product.unit_price) }}</td>
              <td><StatusBadge :status="r.stock_status" /></td>
              <td class="text-right whitespace-nowrap">
                <button v-if="auth.can('movements.create')" class="btn-ghost btn-sm mr-1" @click="openMovement(r)">Stock</button>
                <button v-if="auth.can('products.update')" class="btn-ghost btn-sm mr-1" @click="openEdit(r)">Edit</button>
                <button v-if="auth.can('products.delete')" class="btn-ghost btn-sm text-red-600" @click="removeProduct(r)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- product modal -->
    <ModalDialog :open="productModal" :title="editingId ? 'Edit Product' : 'Add Product'" size="lg"
                 @close="productModal = false">
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class="label">Product name *</label>
          <input v-model="form.productName" class="input" placeholder="Wireless Mouse" />
        </div>
        <div>
          <label class="label">SKU *</label>
          <input v-model="form.sku" class="input font-mono" placeholder="SKU-1001" />
        </div>
        <div>
          <label class="label">Unit price (₱)</label>
          <input v-model.number="form.unitPrice" type="number" min="0" step="0.01" class="input" />
        </div>
        <div>
          <label class="label">Category</label>
          <select v-model="form.categoryId" class="select">
            <option value="">— none —</option>
            <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
          </select>
        </div>
        <div>
          <label class="label">Supplier</label>
          <select v-model="form.supplierId" class="select">
            <option value="">— none —</option>
            <option v-for="s in suppliers" :key="s.supplier_id" :value="s.supplier_id">{{ s.supplier_name }}</option>
          </select>
        </div>

        <div v-if="!editingId">
          <label class="label">Opening stock</label>
          <input v-model.number="form.currentStock" type="number" min="0" class="input" />
        </div>
        <div v-else>
          <label class="label">Current stock</label>
          <input :value="form.currentStock" class="input" disabled />
          <p class="text-[11px] text-slate-400 mt-1">Change stock through a recorded movement.</p>
        </div>

        <div>
          <label class="label">Minimum stock</label>
          <input v-model.number="form.minimumStock" type="number" min="0" class="input" />
        </div>
        <div>
          <label class="label">Reorder point</label>
          <input v-model.number="form.reorderPoint" type="number" min="0" class="input" />
        </div>
        <div>
          <label class="label">Expiration date</label>
          <input v-model="form.expirationDate" type="date" class="input" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Location</label>
          <input v-model="form.location" class="input" placeholder="Main Warehouse" />
        </div>
      </div>

      <ul v-if="formErrors.length" class="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-0.5">
        <li v-for="(e, i) in formErrors" :key="i">{{ e }}</li>
      </ul>

      <template #footer>
        <button class="btn-ghost" @click="productModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="saveProduct">
          {{ saving ? 'Saving…' : (editingId ? 'Save changes' : 'Add product') }}
        </button>
      </template>
    </ModalDialog>

    <!-- movement modal -->
    <ModalDialog :open="moveModal" title="Record Stock Movement" @close="moveModal = false">
      <div v-if="moveTarget" class="rounded-lg bg-slate-50 px-4 py-3 mb-4">
        <p class="font-semibold text-slate-800">{{ moveTarget.product.product_name }}</p>
        <p class="text-xs text-slate-500 font-mono">{{ moveTarget.product.sku }}</p>
        <p class="text-sm text-slate-600 mt-1">Current stock: <span class="font-semibold">{{ moveTarget.current_stock }}</span></p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="label">Movement type</label>
          <select v-model="moveForm.movementType" class="select">
            <option value="stock_in">Stock In — received</option>
            <option value="stock_out">Stock Out — issued or sold</option>
            <option value="returned">Returned — back into stock</option>
            <option value="damaged">Damaged — write off</option>
            <option value="missing">Missing — unaccounted</option>
            <option value="adjustment">Adjustment — correction (may be negative)</option>
          </select>
        </div>
        <div>
          <label class="label">Quantity</label>
          <input v-model.number="moveForm.quantity" type="number" class="input" />
          <p class="text-[11px] text-slate-400 mt-1">
            Adjustments may be negative. Every other type must be greater than zero.
          </p>
        </div>
        <div>
          <label class="label">Reason / remarks</label>
          <input v-model="moveForm.reason" class="input" placeholder="Delivery from supplier, breakage, cycle count…" />
        </div>
        <div>
          <label class="label">Reference no.</label>
          <input v-model="moveForm.referenceNo" class="input" placeholder="DR-2026-0142" />
        </div>

        <p v-if="moveError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {{ moveError }}
        </p>
      </div>

      <template #footer>
        <button class="btn-ghost" @click="moveModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="submitMovement">
          {{ saving ? 'Recording…' : 'Record movement' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
