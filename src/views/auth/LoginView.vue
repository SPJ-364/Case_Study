<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

const DEMO = [
  { role: 'Super Admin',     email: 'superadmin@ims.local', password: 'SuperAdmin123!' },
  { role: 'Warehouse Admin', email: 'warehouse@ims.local',  password: 'Warehouse123!'  },
  { role: 'Staff Admin',     email: 'staff@ims.local',      password: 'StaffAdmin123!' },
  { role: 'Finance Admin',   email: 'finance@ims.local',    password: 'Finance123!'    },
];

const useDemo = (d) => { email.value = d.email; password.value = d.password; };

const submit = async () => {
  try {
    await auth.login(email.value, password.value);
    router.push(route.query.redirect || '/dashboard');
  } catch { /* auth.error is rendered below */ }
};
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- brand panel -->
    <div class="hidden lg:flex flex-col justify-between bg-navy-900 text-white p-12">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-lg bg-white/10 grid place-items-center text-sm font-bold">IMS</div>
        <span class="font-semibold">Inventory Management System</span>
      </div>

      <div class="max-w-md">
        <h1 class="text-3xl font-bold leading-tight mb-4">
          Track stock, cut shrinkage, act on alerts.
        </h1>
        <p class="text-navy-200 text-sm leading-relaxed">
          Every stock change is recorded against the person who made it, and alert
          rules run in the database — so what you see on the dashboard is always
          what the ledger says.
        </p>

        <div class="mt-10 space-y-3">
          <div v-for="r in DEMO" :key="r.role" class="flex items-center gap-3 text-sm">
            <span class="h-1.5 w-1.5 rounded-full bg-navy-400" />
            <span class="text-navy-200">{{ r.role }}</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-navy-400">CCS112 — Applications Development and Emerging Technologies</p>
    </div>

    <!-- form panel -->
    <div class="flex items-center justify-center p-6 sm:p-12 bg-white">
      <div class="w-full max-w-sm">
        <div class="lg:hidden flex items-center gap-2.5 mb-8">
          <div class="h-9 w-9 rounded-lg bg-navy-800 text-white grid place-items-center text-xs font-bold">IMS</div>
          <span class="font-semibold text-slate-900">Inventory Management System</span>
        </div>

        <h2 class="text-2xl font-bold text-slate-900">Sign in</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">Use the account issued by your Super Admin.</p>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" v-model="email" type="email" required autocomplete="username"
                   class="input" placeholder="you@ims.local" />
          </div>

          <div>
            <label class="label" for="password">Password</label>
            <div class="relative">
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                     required autocomplete="current-password" class="input pr-16" placeholder="••••••••" />
              <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 px-1"
                      @click="showPassword = !showPassword">
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <p v-if="auth.error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {{ auth.error }}
          </p>

          <button type="submit" class="btn-primary w-full" :disabled="auth.loading">
            {{ auth.loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-slate-200">
          <p class="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Demo accounts</p>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="d in DEMO" :key="d.email" type="button"
                    class="text-left rounded-lg border border-slate-200 px-3 py-2 hover:border-navy-400 hover:bg-slate-50 transition-colors"
                    @click="useDemo(d)">
              <p class="text-xs font-semibold text-slate-700">{{ d.role }}</p>
              <p class="text-[11px] text-slate-400 truncate">{{ d.email }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
