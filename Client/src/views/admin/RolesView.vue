<script setup>
import { ref, onMounted, computed } from 'vue';
import { rolesApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import ModalDialog from '@/components/ui/ModalDialog.vue';

const auth = useAuthStore();
const toast = useToastStore();

const roles = ref([]);
const grouped = ref({});
const loading = ref(true);
const saving = ref(false);

const editor = ref(false);
const active = ref(null);
const selected = ref(new Set());

const createModal = ref(false);
const newRole = ref({ roleCode: '', roleName: '', description: '' });
const errors = ref([]);

const MODULE_LABEL = {
  inventory: 'Warehouse & Inventory',
  staff: 'Staff & Security',
  finance: 'Finance',
  reports: 'Reports',
  system: 'System Administration',
};

const roleBadge = (code) => ({
  super_admin: 'badge-purple', warehouse_admin: 'badge-blue',
  staff_admin: 'badge-amber', finance_admin: 'badge-green',
}[code] || 'badge-gray');

const openEditor = (role) => {
  active.value = role;
  selected.value = new Set(role.permissions.map((p) => p.permission_id));
  editor.value = true;
};

const toggle = (id) => {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
};

const toggleModule = (moduleKey) => {
  const ids = grouped.value[moduleKey].map((p) => p.permission_id);
  const allOn = ids.every((id) => selected.value.has(id));
  const next = new Set(selected.value);
  ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
  selected.value = next;
};

const moduleState = (moduleKey) => {
  const ids = grouped.value[moduleKey]?.map((p) => p.permission_id) ?? [];
  const on = ids.filter((id) => selected.value.has(id)).length;
  return { on, total: ids.length, all: on === ids.length && ids.length > 0 };
};

const savePermissions = async () => {
  saving.value = true;
  try {
    await rolesApi.setPermissions(active.value.roleId, [...selected.value]);
    toast.success(`Permissions updated for ${active.value.roleName}.`);
    editor.value = false;
    await load();
    // If the signed-in user's own role changed, refresh their menu immediately.
    if (active.value.roleCode === auth.roleCode) await auth.refreshProfile();
  } catch (e) { toast.error(e.message); }
  finally { saving.value = false; }
};

const createRole = async () => {
  saving.value = true; errors.value = [];
  try {
    await rolesApi.create({ ...newRole.value, permissionIds: [] });
    toast.success('Role created. Assign its permissions next.');
    createModal.value = false;
    newRole.value = { roleCode: '', roleName: '', description: '' };
    await load();
  } catch (e) {
    errors.value = e.details?.map((d) => `${d.field}: ${d.message}`) ?? [e.message];
  } finally { saving.value = false; }
};

const removeRole = async (role) => {
  if (!confirm(`Delete the role "${role.roleName}"?`)) return;
  try { await rolesApi.remove(role.roleId); toast.success('Role deleted.'); await load(); }
  catch (e) { toast.error(e.message); }
};

const load = async () => {
  loading.value = true;
  try {
    const [list, perms] = await Promise.all([rolesApi.list(), rolesApi.permissions()]);
    roles.value = list;
    grouped.value = perms.grouped;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

const modules = computed(() => Object.keys(grouped.value));

onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <div class="card p-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-slate-800">Administrative hierarchy</p>
        <p class="text-xs text-slate-500 mt-0.5">
          Menus and API access are both driven by these permission sets. Changing a role here
          changes what every account holding it can see and do.
        </p>
      </div>
      <button class="btn-primary btn-sm" @click="createModal = true">+ New Role</button>
    </div>

    <div v-if="loading" class="text-center py-16 text-slate-400">Loading roles…</div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <div v-for="role in roles" :key="role.roleId" class="card">
        <div class="card-header">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="card-title">{{ role.roleName }}</h3>
              <span :class="roleBadge(role.roleCode)">{{ role.roleCode }}</span>
              <span v-if="role.isSystem" class="badge-gray">system</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ role.description }}</p>
          </div>
        </div>
        <div class="card-body">
          <div class="flex items-center justify-between text-sm mb-3">
            <span class="text-slate-500">{{ role.userCount }} active user(s)</span>
            <span class="badge-gray">{{ role.permissions.length }} permission(s)</span>
          </div>

          <div class="flex flex-wrap gap-1.5 mb-4 max-h-24 overflow-y-auto">
            <span v-for="p in role.permissions.slice(0, 12)" :key="p.permission_id"
                  class="text-[10px] font-mono bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
              {{ p.permission_code }}
            </span>
            <span v-if="role.permissions.length > 12" class="text-[10px] text-slate-400 px-1.5 py-0.5">
              +{{ role.permissions.length - 12 }} more
            </span>
          </div>

          <div class="flex gap-2">
            <button class="btn-ghost btn-sm" :disabled="role.roleCode === 'super_admin'" @click="openEditor(role)">
              {{ role.roleCode === 'super_admin' ? 'Full access (locked)' : 'Edit permissions' }}
            </button>
            <button v-if="!role.isSystem" class="btn-ghost btn-sm text-red-600" @click="removeRole(role)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- permission editor -->
    <ModalDialog :open="editor" :title="`Permissions — ${active?.roleName || ''}`" size="lg" @close="editor = false">
      <div class="space-y-5">
        <p class="text-sm text-slate-600">
          Selected: <span class="font-semibold">{{ selected.size }}</span> permission(s).
        </p>

        <div v-for="m in modules" :key="m" class="border border-slate-200 rounded-lg">
          <div class="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-t-lg">
            <p class="text-sm font-semibold text-slate-700">{{ MODULE_LABEL[m] || m }}</p>
            <button class="text-xs font-medium text-navy-600 hover:underline" @click="toggleModule(m)">
              {{ moduleState(m).all ? 'Clear all' : 'Select all' }}
              ({{ moduleState(m).on }}/{{ moduleState(m).total }})
            </button>
          </div>
          <div class="p-3 grid sm:grid-cols-2 gap-1.5">
            <label v-for="p in grouped[m]" :key="p.permission_id"
                   class="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" class="mt-0.5 rounded border-slate-300"
                     :checked="selected.has(p.permission_id)" @change="toggle(p.permission_id)" />
              <span class="min-w-0">
                <span class="block text-xs font-mono text-slate-700">{{ p.permission_code }}</span>
                <span class="block text-[11px] text-slate-400">{{ p.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-ghost" @click="editor = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="savePermissions">
          {{ saving ? 'Saving…' : 'Save permissions' }}
        </button>
      </template>
    </ModalDialog>

    <!-- create role -->
    <ModalDialog :open="createModal" title="New Role" @close="createModal = false">
      <div class="space-y-4">
        <div>
          <label class="label">Role code *</label>
          <input v-model="newRole.roleCode" class="input font-mono" placeholder="audit_admin" />
          <p class="text-[11px] text-slate-400 mt-1">Lowercase letters and underscores only.</p>
        </div>
        <div><label class="label">Role name *</label><input v-model="newRole.roleName" class="input" placeholder="Audit Admin" /></div>
        <div><label class="label">Description</label><textarea v-model="newRole.description" rows="2" class="input" /></div>
        <ul v-if="errors.length" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-0.5">
          <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
        </ul>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="createModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="createRole">{{ saving ? 'Creating…' : 'Create role' }}</button>
      </template>
    </ModalDialog>
  </div>
</template>
