<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { suppliersApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import ModalDialog from '@/components/ui/ModalDialog.vue';

const auth = useAuthStore();
const toast = useToastStore();

const rows = ref([]);
const loading = ref(true);
const filters = reactive({ search: '', active: '' });

const modal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const errors = ref([]);
const form = reactive({ supplierName: '', contactPerson: '', contactNumber: '', email: '', address: '', isActive: true });

const reset = () => {
  Object.assign(form, { supplierName: '', contactPerson: '', contactNumber: '', email: '', address: '', isActive: true });
  errors.value = []; editingId.value = null;
};

const openCreate = () => { reset(); modal.value = true; };

const openEdit = (s) => {
  reset();
  editingId.value = s.supplier_id;
  Object.assign(form, {
    supplierName: s.supplier_name, contactPerson: s.contact_person ?? '',
    contactNumber: s.contact_number ?? '', email: s.email ?? '',
    address: s.address ?? '', isActive: s.is_active,
  });
  modal.value = true;
};

const save = async () => {
  saving.value = true; errors.value = [];
  try {
    const payload = { ...form, email: form.email || null };
    if (editingId.value) { await suppliersApi.update(editingId.value, payload); toast.success('Supplier updated.'); }
    else { await suppliersApi.create(payload); toast.success('Supplier added.'); }
    modal.value = false;
    await load();
  } catch (e) {
    errors.value = e.details?.map((d) => `${d.field}: ${d.message}`) ?? [e.message];
  } finally { saving.value = false; }
};

const remove = async (s) => {
  if (!confirm(`Delete supplier "${s.supplier_name}"? Products linked to it will keep their records but lose the supplier.`)) return;
  try { await suppliersApi.remove(s.supplier_id); toast.success('Supplier deleted.'); await load(); }
  catch (e) { toast.error(e.message); }
};

const load = async () => {
  loading.value = true;
  try { rows.value = await suppliersApi.list({ search: filters.search, active: filters.active }); }
  catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

let t;
watch(() => filters.search, () => { clearTimeout(t); t = setTimeout(load, 350); });
watch(() => filters.active, load);
onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <div class="card p-4 flex flex-wrap items-center gap-3">
      <input v-model="filters.search" class="input flex-1 min-w-[200px]" placeholder="Search supplier name…" />
      <select v-model="filters.active" class="select w-auto min-w-[140px]">
        <option value="">All suppliers</option>
        <option value="true">Active only</option>
        <option value="false">Inactive only</option>
      </select>
      <button v-if="auth.can('suppliers.manage')" class="btn-primary btn-sm ml-auto" @click="openCreate">
        + Add Supplier
      </button>
    </div>

    <div class="card">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Supplier</th><th>Contact Person</th><th>Phone</th><th>Email</th>
              <th class="text-right">Products</th><th>Status</th><th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7" class="text-center py-12 text-slate-400">Loading suppliers…</td></tr>
            <tr v-else-if="!rows.length"><td colspan="7" class="text-center py-12 text-slate-400">No suppliers found.</td></tr>
            <tr v-else v-for="s in rows" :key="s.supplier_id">
              <td>
                <p class="font-medium text-slate-800">{{ s.supplier_name }}</p>
                <p class="text-xs text-slate-400 truncate max-w-xs">{{ s.address || '—' }}</p>
              </td>
              <td class="text-slate-600">{{ s.contact_person || '—' }}</td>
              <td class="text-slate-600 whitespace-nowrap">{{ s.contact_number || '—' }}</td>
              <td class="text-slate-600 text-sm">{{ s.email || '—' }}</td>
              <td class="text-right tabular-nums">{{ s.productCount }}</td>
              <td>
                <span :class="s.is_active ? 'badge-green' : 'badge-gray'">
                  {{ s.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="text-right whitespace-nowrap">
                <button v-if="auth.can('suppliers.manage')" class="btn-ghost btn-sm mr-1" @click="openEdit(s)">Edit</button>
                <button v-if="auth.can('suppliers.manage')" class="btn-ghost btn-sm text-red-600" @click="remove(s)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ModalDialog :open="modal" :title="editingId ? 'Edit Supplier' : 'Add Supplier'" @close="modal = false">
      <div class="space-y-4">
        <div><label class="label">Supplier name *</label>
          <input v-model="form.supplierName" class="input" placeholder="TechSource Inc." /></div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="label">Contact person</label><input v-model="form.contactPerson" class="input" /></div>
          <div><label class="label">Contact number</label><input v-model="form.contactNumber" class="input" /></div>
        </div>
        <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" /></div>
        <div><label class="label">Address</label><textarea v-model="form.address" rows="2" class="input" /></div>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.isActive" type="checkbox" class="rounded border-slate-300" />
          Active supplier
        </label>
        <ul v-if="errors.length" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-0.5">
          <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
        </ul>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="modal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</button>
      </template>
    </ModalDialog>
  </div>
</template>
