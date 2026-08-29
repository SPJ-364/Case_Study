<script setup>
import { ref } from 'vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

const sidebarOpen = ref(false);
</script>

<template>
  <div class="flex min-h-screen bg-slate-100">
    <AppSidebar :mobile-open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex-1 min-w-0 flex flex-col">
      <AppTopbar @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main class="flex-1 p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
