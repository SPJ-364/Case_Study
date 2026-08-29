<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

defineProps({ mobileOpen: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const auth = useAuthStore();

/**
 * Navigation is driven by permissions, not by role name, so a Super Admin who
 * edits a role's permissions immediately changes what that role can see.
 */
const SECTIONS = [
  {
    heading: null,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: '▦', permission: null }],
  },
  {
    heading: 'Warehouse',
    items: [
      { to: '/inventory', label: 'Inventory',       icon: '▤', permission: 'inventory.view' },
      { to: '/movements', label: 'Stock Movements', icon: '⇄', permission: 'movements.view' },
      { to: '/alerts',    label: 'Alerts',          icon: '⚠', permission: 'alerts.view' },
      { to: '/suppliers', label: 'Suppliers',       icon: '⛟', permission: 'suppliers.view' },
    ],
  },
  {
    heading: 'Staff',
    items: [{ to: '/staff', label: 'Staff Management', icon: '☺', permission: 'staff.view' }],
  },
  {
    heading: 'Finance',
    items: [{ to: '/finance', label: 'Financial Records', icon: '₱', permission: 'finance.view' }],
  },
  {
    heading: 'Insights',
    items: [{ to: '/reports', label: 'Reports', icon: '◫', permission: 'reports.view' }],
  },
  {
    heading: 'System',
    items: [
      { to: '/users',    label: 'Users',              icon: '◉', permission: 'users.view' },
      { to: '/roles',    label: 'Roles & Permissions',icon: '⚿', permission: 'roles.manage' },
      { to: '/activity', label: 'System Activity',    icon: '≡', permission: 'logs.view' },
    ],
  },
];

const sections = computed(() =>
  SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || auth.can(i.permission)) }))
    .filter((s) => s.items.length));
</script>

<template>
  <!-- mobile backdrop -->
  <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" @click="emit('close')" />

  <aside :class="['fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform lg:translate-x-0',
                  mobileOpen ? 'translate-x-0' : '-translate-x-full']">
    <div class="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200 shrink-0">
      <div class="h-8 w-8 rounded-lg bg-navy-800 text-white grid place-items-center text-xs font-bold">IMS</div>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-900 leading-tight truncate">Inventory System</p>
        <p class="text-[11px] text-slate-400 leading-tight">{{ auth.roleName }}</p>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      <div v-for="(section, si) in sections" :key="si">
        <p v-if="section.heading"
           class="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {{ section.heading }}
        </p>
        <div class="space-y-0.5">
          <RouterLink v-for="item in section.items" :key="item.to" :to="item.to"
                      class="nav-link" active-class="nav-link-active" @click="emit('close')">
            <span class="w-4 text-center opacity-70">{{ item.icon }}</span>
            <span class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="p-3 border-t border-slate-200 shrink-0">
      <div class="rounded-lg bg-slate-50 px-3 py-2.5">
        <p class="text-xs font-semibold text-slate-700 truncate">{{ auth.user?.fullName }}</p>
        <p class="text-[11px] text-slate-500 truncate">{{ auth.user?.email }}</p>
      </div>
    </div>
  </aside>
</template>
