<script setup>
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
</script>

<template>
  <div class="card p-10 text-center max-w-lg mx-auto mt-10">
    <div class="mx-auto h-14 w-14 rounded-full bg-red-100 grid place-items-center mb-4">
      <span class="text-red-600 text-2xl">⊘</span>
    </div>
    <h2 class="text-lg font-bold text-slate-900">Access denied</h2>
    <p class="text-sm text-slate-500 mt-2">
      Your role — <span class="font-medium text-slate-700">{{ auth.roleName }}</span> — does not
      include permission for this area. If you need it, ask your Super Admin to grant the
      matching permission under Roles &amp; Permissions.
    </p>
    <RouterLink to="/dashboard" class="btn-primary mt-6">Back to dashboard</RouterLink>
  </div>
</template>
