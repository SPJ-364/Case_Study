<script setup>
import { watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
});
const emit = defineEmits(['close']);

const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

const onKey = (e) => { if (e.key === 'Escape') emit('close'); };

watch(() => props.open, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (isOpen) window.addEventListener('keydown', onKey);
  else window.removeEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div class="fixed inset-0 bg-slate-900/50" @click="emit('close')" />
      <div :class="['relative w-full bg-white rounded-xl shadow-xl my-8', sizes[size] || sizes.md]"
           role="dialog" aria-modal="true">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
          <button class="text-slate-400 hover:text-slate-700 text-xl leading-none px-1"
                  @click="emit('close')" aria-label="Close">&times;</button>
        </div>
        <div class="p-5"><slot /></div>
        <div v-if="$slots.footer" class="px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
