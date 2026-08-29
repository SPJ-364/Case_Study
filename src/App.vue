<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const auth = useAuthStore();

const isBlank = computed(() => route.meta.layout === 'blank');

// Pull the latest role/permissions on load so changes apply without a re-login.
onMounted(() => { if (auth.isAuthenticated) auth.refreshProfile(); });
</script>

<template>
  <component :is="isBlank ? 'div' : AppLayout">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </component>
  <ToastHost />
</template>
