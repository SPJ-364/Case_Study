<script setup>
import { ref, onMounted } from 'vue';
import { usersApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const auth = useAuthStore();
const toast = useToastStore();
const users = ref([]);
const loading = ref(true);

onMounted(async () => {
  if (!auth.can('users.view')) { loading.value = false; return; }
  try { users.value = await usersApi.list({ active: 'true' }); }
  catch (e) { toast.error(e.message); }
  finally { loading.value = false; }
});
</script>

<template>
  <div class="space-y-5">
    <!-- Honest scope note: the prelim blueprint deferred full staff records. -->
    <div class="card p-4 border-l-4 border-l-amber-400 bg-amber-50/50">
      <p class="text-sm font-semibold text-slate-800">Staff Admin — partial scope</p>
      <p class="text-sm text-slate-600 mt-1">
        The midterm build covers <span class="font-medium">security and access management</span>
        through system accounts and role assignment. Full staff information management
        (employment records, schedules, departments) is scheduled for the finals phase and
        will need its own <code class="text-xs bg-white px-1 py-0.5 rounded">staff</code> table
        separate from system users.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <RouterLink v-if="auth.can('users.view')" to="/users"
                  class="card p-5 hover:border-navy-400 transition-colors">
        <p class="text-sm font-semibold text-slate-800">Security &amp; Access Management</p>
        <p class="text-sm text-slate-500 mt-1">
          Create accounts, assign roles, reset passwords and deactivate access.
        </p>
        <span class="text-xs text-navy-600 font-medium mt-3 inline-block">Open user management &rarr;</span>
      </RouterLink>

      <div class="card p-5 opacity-60">
        <p class="text-sm font-semibold text-slate-800">Staff Information Management</p>
        <p class="text-sm text-slate-500 mt-1">
          Employment details, positions, departments and schedules.
        </p>
        <span class="badge-amber mt-3">Planned — finals phase</span>
      </div>
    </div>

    <div v-if="auth.can('users.view')" class="card">
      <div class="card-header">
        <h3 class="card-title">Active Personnel with System Access</h3>
        <span class="text-xs text-slate-400">{{ users.length }} account(s)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="table">
          <thead><tr><th>Name</th><th>Position</th><th>Role</th><th>Contact</th><th>Email</th></tr></thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="text-center py-12 text-slate-400">Loading…</td></tr>
            <tr v-else-if="!users.length"><td colspan="5" class="text-center py-12 text-slate-400">No active accounts.</td></tr>
            <tr v-else v-for="u in users" :key="u.user_id">
              <td class="font-medium text-slate-800">{{ u.full_name }}</td>
              <td class="text-slate-600">{{ u.position || '—' }}</td>
              <td><span class="badge-gray">{{ u.role?.role_name }}</span></td>
              <td class="text-slate-600 text-sm">{{ u.contact_number || '—' }}</td>
              <td class="text-slate-600 text-sm">{{ u.email }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
