<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { logsApi } from '@/api';
import { useToastStore } from '@/stores/toast';

const toast = useToastStore();
const rows = ref([]);
const loading = ref(true);
const filters = reactive({ action: '', entityType: '' });

const when = (d) => new Date(d).toLocaleString('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit',
});

const load = async () => {
  loading.value = true;
  try {
    const res = await logsApi.list({ action: filters.action, entityType: filters.entityType, limit: 200 });
    rows.value = res.data;
  } catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
};

watch(() => [filters.action, filters.entityType], load);
onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <div class="card p-4 flex flex-wrap items-center gap-3">
      <select v-model="filters.entityType" class="select w-auto min-w-[170px]">
        <option value="">All areas</option>
        <option value="auth">Authentication</option>
        <option value="products">Products</option>
        <option value="inventory">Inventory</option>
        <option value="stock_movements">Stock Movements</option>
        <option value="alerts">Alerts</option>
        <option value="suppliers">Suppliers</option>
        <option value="users">Users</option>
        <option value="roles">Roles</option>
      </select>
      <button class="btn-ghost btn-sm" @click="filters.action=''; filters.entityType=''">Clear</button>
      <button class="btn-ghost btn-sm ml-auto" :disabled="loading" @click="load">Refresh</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">System Activity Log</h3>
        <span class="text-xs text-slate-400">{{ rows.length }} entries (most recent first)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Area</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="6" class="text-center py-12 text-slate-400">Loading activity…</td></tr>
            <tr v-else-if="!rows.length"><td colspan="6" class="text-center py-12 text-slate-400">No activity recorded.</td></tr>
            <tr v-else v-for="log in rows" :key="log.log_id">
              <td class="text-xs text-slate-500 whitespace-nowrap">{{ when(log.created_at) }}</td>
              <td class="text-sm font-medium text-slate-700">{{ log.user?.full_name || 'System' }}</td>
              <td class="text-xs text-slate-500">{{ log.user?.role?.role_code || '—' }}</td>
              <td><span class="badge-gray">{{ log.action.replace(/_/g, ' ') }}</span></td>
              <td class="text-sm text-slate-600">{{ log.entity_type || '—' }}</td>
              <td class="text-xs font-mono text-slate-400 max-w-xs truncate">
                {{ log.details ? JSON.stringify(log.details) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
