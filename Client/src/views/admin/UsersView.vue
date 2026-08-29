<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { usersApi, rolesApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import ModalDialog from '@/components/ui/ModalDialog.vue';

const auth = useAuthStore();
const toast = useToastStore();

const users = ref([]);
const roles = ref([]);
const loading = ref(true);
const filters = reactive({ search: '', role: '', active: '' });

const modal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const errors = ref([]);
const form = reactive({
  fullName: '', username: '', email: '', password: '',
  roleId: '', position: '', contactNumber: '', isActive: true,
});

const pwModal = ref(false);
const pwTarget = ref(null);
const newPassword = ref('');

const roleBadge = (code) => ({
  super_admin: 'badge-purple', warehouse_admin: 'badge-blue',
  staff_admin: 'badge-amber', finance_admin: 'badge-green',
}[code] || 'badge-gray');

const reset = () => {
  Object.assign(form, {
    fullName: '', username: '', email: '', password: '',
    roleId: roles.value[0]?.roleId ?? '', position: '', contactNumber: '', isActive: true,
  });
  errors.value = []; editingId.value = null;
};

const openCreate = () => { reset(); modal.value = true; };

const openEdit = (u) => {
  reset();
  editingId.value = u.user_id;
  Object.assign(form, {
    fullName: u.full_name, username: u.username, email: u.email,
    roleId: u.role?.role_id ?? '', position: u.position ?? '',
    contactNumber: u.contact_number ?? '', isActive: u.is_active,
  });
  modal.value = true;
};

const save = async () => {
  saving.value = true; errors.value = [];
  try {
    if (editingId.value) {
      await usersApi.update(editingId.value, {
        fullName: form.fullName, username: form.username, roleId: Number(form.roleId),
        position: form.position || null, contactNumber: form.contactNumber || null,
        isActive: form.isActive,
      });
      toast.success('User updated.');
    } else {
      await usersApi.create({
        fullName: form.fullName, username: form.username, email: form.email,
        password: form.password, roleId: Number(form.roleId),
        position: form.position || null, contactNumber: form.contactNumber || null,
      });
      toast.success('User account created.');
    }
    modal.value = false;
    await load();
  } catch (e) {
    errors.value = e.details?.map((d) => `${d.field}: ${d.message}`) ?? [e.message];
  } finally { saving.value = false; }
};

const toggleActive = async (u) => {
  try {
    await usersApi.update(u.user_id, { isActive: !u.is_active });
    toast.success(u.is_active ? 'Account deactivated.' : 'Account reactivated.');
    await load();
  } catch (e) { toast.error(e.message); }
};

const remove = async (u) => {
  if (!confirm(`Permanently delete the account for ${u.full_name}? This cannot be undone.`)) return;
  try { await usersApi.remove(u.user_id); toast.success('Account deleted.'); await load(); }
  catch (e) { toast.error(e.message); }
};

const openPassword = (u) => { pwTarget.value = u; newPassword.value = ''; pwModal.value = true; };

const savePassword = async () => {
  saving.value = true;
  try {
    await usersApi.resetPassword(pwTarget.value.user_id, newPassword.value);
    toast.success(`Password reset for ${pwTarget.value.full_name}.`);
    pwModal.value = false;
  } catch (e) { toast.error(e.message); }
  finally { saving.value = false; }
};

const load = async () => {
  loading.value = true;
  try { users.value = await usersApi.list({ search: filters.search, role: filters.role, active: filters.active }); }
  catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

let t;
watch(() => filters.search, () => { clearTimeout(t); t = setTimeout(load, 350); });
watch(() => [filters.role, filters.active], load);

onMounted(async () => {
  try { roles.value = await rolesApi.list(); } catch { /* ignore */ }
  await load();
});
</script>

<template>
  <div class="space-y-5">
    <div class="card p-4 flex flex-wrap items-center gap-3">
      <input v-model="filters.search" class="input flex-1 min-w-[200px]" placeholder="Search name, username or email…" />
      <select v-model="filters.role" class="select w-auto min-w-[170px]">
        <option value="">All roles</option>
        <option v-for="r in roles" :key="r.roleId" :value="r.roleCode">{{ r.roleName }}</option>
      </select>
      <select v-model="filters.active" class="select w-auto min-w-[140px]">
        <option value="">All accounts</option>
        <option value="true">Active only</option>
        <option value="false">Deactivated</option>
      </select>
      <button v-if="auth.can('users.manage')" class="btn-primary btn-sm ml-auto" @click="openCreate">
        + Add User
      </button>
    </div>

    <div class="card">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Position</th><th>Status</th><th class="text-right">Actions</th></tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="7" class="text-center py-12 text-slate-400">Loading users…</td></tr>
            <tr v-else-if="!users.length"><td colspan="7" class="text-center py-12 text-slate-400">No user accounts found.</td></tr>
            <tr v-else v-for="u in users" :key="u.user_id">
              <td class="font-medium text-slate-800">{{ u.full_name }}</td>
              <td class="font-mono text-xs text-slate-500">{{ u.username }}</td>
              <td class="text-slate-600 text-sm">{{ u.email }}</td>
              <td><span :class="roleBadge(u.role?.role_code)">{{ u.role?.role_name }}</span></td>
              <td class="text-slate-600 text-sm">{{ u.position || '—' }}</td>
              <td><span :class="u.is_active ? 'badge-green' : 'badge-gray'">{{ u.is_active ? 'Active' : 'Deactivated' }}</span></td>
              <td class="text-right whitespace-nowrap">
                <template v-if="auth.can('users.manage')">
                  <button class="btn-ghost btn-sm mr-1" @click="openEdit(u)">Edit</button>
                  <button class="btn-ghost btn-sm mr-1" @click="openPassword(u)">Password</button>
                  <button class="btn-ghost btn-sm mr-1" @click="toggleActive(u)">
                    {{ u.is_active ? 'Disable' : 'Enable' }}
                  </button>
                  <button class="btn-ghost btn-sm text-red-600" @click="remove(u)">Delete</button>
                </template>
                <span v-else class="text-xs text-slate-400">View only</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- user modal -->
    <ModalDialog :open="modal" :title="editingId ? 'Edit User' : 'Add User'" @close="modal = false">
      <div class="space-y-4">
        <div><label class="label">Full name *</label><input v-model="form.fullName" class="input" /></div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="label">Username *</label><input v-model="form.username" class="input font-mono" /></div>
          <div>
            <label class="label">Email *</label>
            <input v-model="form.email" type="email" class="input" :disabled="!!editingId" />
            <p v-if="editingId" class="text-[11px] text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>
        </div>
        <div v-if="!editingId">
          <label class="label">Temporary password *</label>
          <input v-model="form.password" type="text" class="input font-mono" placeholder="At least 8 characters" />
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Role *</label>
            <select v-model="form.roleId" class="select">
              <option v-for="r in roles" :key="r.roleId" :value="r.roleId">{{ r.roleName }}</option>
            </select>
          </div>
          <div><label class="label">Position</label><input v-model="form.position" class="input" /></div>
        </div>
        <div><label class="label">Contact number</label><input v-model="form.contactNumber" class="input" /></div>
        <label v-if="editingId" class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.isActive" type="checkbox" class="rounded border-slate-300" />
          Account is active
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

    <!-- password modal -->
    <ModalDialog :open="pwModal" title="Reset Password" size="sm" @close="pwModal = false">
      <p class="text-sm text-slate-600 mb-4">
        Set a new password for <span class="font-semibold">{{ pwTarget?.full_name }}</span>.
        Share it with them directly and ask them to change it.
      </p>
      <label class="label">New password</label>
      <input v-model="newPassword" type="text" class="input font-mono" placeholder="At least 8 characters" />
      <template #footer>
        <button class="btn-ghost" @click="pwModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving || newPassword.length < 8" @click="savePassword">
          {{ saving ? 'Saving…' : 'Reset password' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
