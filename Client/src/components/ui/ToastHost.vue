<script setup>
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();

const tone = {
  success: 'bg-emerald-600',
  error:   'bg-red-600',
  info:    'bg-navy-800',
};
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
    <div v-for="t in toast.items" :key="t.id"
         :class="['text-white text-sm rounded-lg shadow-lg px-4 py-3 flex items-start gap-3', tone[t.type] || tone.info]">
      <span class="flex-1">{{ t.message }}</span>
      <button class="opacity-70 hover:opacity-100 leading-none" @click="toast.dismiss(t.id)">&times;</button>
    </div>
  </div>
</template>
