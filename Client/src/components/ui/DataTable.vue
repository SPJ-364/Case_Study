<script setup>
defineProps({
  columns: { type: Array, required: true },   // [{ key, label, align, width }]
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'No records found.' },
  rowKey: { type: String, default: 'id' },
});
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key"
              :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''"
              :style="col.width ? { width: col.width } : null">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="text-center py-10 text-slate-400">Loading…</td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="text-center py-10 text-slate-400">{{ emptyMessage }}</td>
        </tr>
        <tr v-else v-for="(row, i) in rows" :key="row[rowKey] ?? i">
          <td v-for="col in columns" :key="col.key"
              :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="i">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
