<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  sublabel: { type: String, default: '' },
  tone: { type: String, default: 'default' }, // default | amber | red | green | blue
});

const tones = {
  default: 'bg-slate-100 text-slate-600',
  amber:   'bg-amber-100 text-amber-700',
  red:     'bg-red-100 text-red-700',
  green:   'bg-emerald-100 text-emerald-700',
  blue:    'bg-blue-100 text-blue-700',
};
</script>

<template>
  <div class="card p-4 flex items-start gap-3">
    <div :class="['h-10 w-10 shrink-0 rounded-lg grid place-items-center', tones[tone] || tones.default]">
      <slot name="icon">
        <span class="text-base font-bold">{{ String(label).charAt(0) }}</span>
      </slot>
    </div>
    <div class="min-w-0">
      <p class="text-xs font-medium text-slate-500 truncate">{{ label }}</p>
      <p class="text-2xl font-bold text-slate-900 leading-tight">{{ value }}</p>
      <p v-if="sublabel" class="text-xs text-slate-400 mt-0.5">{{ sublabel }}</p>
    </div>
  </div>
</template>
