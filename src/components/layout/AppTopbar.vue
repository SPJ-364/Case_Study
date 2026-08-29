<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const emit = defineEmits(['toggle-sidebar']);
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const menuOpen = ref(false);
const menuRef = ref(null);

const title = computed(() => route.meta.title || 'Dashboard');
const initials = computed(() => (auth.user?.fullName || '?')
  .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase());

const onSignOut = async () => {
  await auth.logout();
  router.push({ name: 'login' });
};

const onClickOutside = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false;
};
onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <header class="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6">
    <button class="lg:hidden text-slate-500 hover:text-slate-800 text-xl leading-none"
            @click="emit('toggle-sidebar')" aria-label="Open menu">☰</button>

    <h1 class="text-base font-semibold text-slate-900 truncate">{{ title }}</h1>

    <div class="ml-auto flex items-center gap-3">
      <RouterLink v-if="auth.can('alerts.view')" to="/alerts"
                  class="relative text-slate-500 hover:text-slate-800 text-lg" title="Alerts">⚠</RouterLink>

      <div ref="menuRef" class="relative">
        <button class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100"
                @click.stop="menuOpen = !menuOpen">
          <div class="h-8 w-8 rounded-full bg-navy-800 text-white grid place-items-center text-xs font-semibold">
            {{ initials }}
          </div>
          <div class="hidden sm:block text-left">
            <p class="text-xs font-semibold text-slate-800 leading-tight">{{ auth.user?.fullName }}</p>
            <p class="text-[11px] text-slate-500 leading-tight">{{ auth.roleName }}</p>
          </div>
        </button>

        <div v-if="menuOpen"
             class="absolute right-0 mt-2 w-60 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-30">
          <div class="px-4 py-2.5 border-b border-slate-100">
            <p class="text-sm font-semibold text-slate-800 truncate">{{ auth.user?.fullName }}</p>
            <p class="text-xs text-slate-500 truncate">{{ auth.user?.email }}</p>
            <span class="badge-gray mt-2">{{ auth.roleName }}</span>
          </div>
          <div class="px-4 py-2 border-b border-slate-100">
            <p class="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Permissions</p>
            <p class="text-xs text-slate-600">{{ auth.permissions.length }} granted</p>
          </div>
          <button class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50" @click="onSignOut">
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
