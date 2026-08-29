<script setup>
import { computed } from 'vue';

const props = defineProps({ status: { type: String, required: true } });

const MAP = {
  in_stock:     { label: 'In Stock',     cls: 'badge-green' },
  low_stock:    { label: 'Low Stock',    cls: 'badge-amber' },
  reorder:      { label: 'Reorder Due',  cls: 'badge-blue'  },
  out_of_stock: { label: 'Out of Stock', cls: 'badge-red'   },

  active:       { label: 'Active',       cls: 'badge-red'   },
  acknowledged: { label: 'Acknowledged', cls: 'badge-amber' },
  resolved:     { label: 'Resolved',     cls: 'badge-green' },

  critical:     { label: 'Critical',     cls: 'badge-red'    },
  high:         { label: 'High',         cls: 'badge-amber'  },
  medium:       { label: 'Medium',       cls: 'badge-blue'   },
  low:          { label: 'Low',          cls: 'badge-gray'   },

  stock_in:     { label: 'Stock In',     cls: 'badge-green'  },
  stock_out:    { label: 'Stock Out',    cls: 'badge-blue'   },
  damaged:      { label: 'Damaged',      cls: 'badge-amber'  },
  missing:      { label: 'Missing',      cls: 'badge-red'    },
  returned:     { label: 'Returned',     cls: 'badge-purple' },
  adjustment:   { label: 'Adjustment',   cls: 'badge-gray'   },

  near_expiry:  { label: 'Near Expiry',  cls: 'badge-amber'  },
  missing_item: { label: 'Missing Item', cls: 'badge-red'    },
  damaged_item: { label: 'Damaged Item', cls: 'badge-amber'  },
};

const entry = computed(() => MAP[props.status] || {
  label: String(props.status).replace(/_/g, ' '),
  cls: 'badge-gray',
});
</script>

<template>
  <span :class="entry.cls">{{ entry.label }}</span>
</template>
