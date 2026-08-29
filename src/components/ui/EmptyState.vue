<script setup>
defineProps({
  title: { type: String, default: 'Nothing here yet' },
  message: { type: String, default: '' },
});
</script>

<template>
  <div class="text-center py-12 px-6">
    <div class="mx-auto h-12 w-12 rounded-full bg-slate-100 grid place-items-center mb-3">
      <slot name="icon"><span class="text-slate-400 text-xl">∅</span></slot>
    </div>
    <p class="text-sm font-semibold text-slate-700">{{ title }}</p>
    <p v-if="message" class="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{{ message }}</p>
    <div class="mt-4"><slot /></div>
  </div>
</template>
