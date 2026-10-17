<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@nanostores/vue';
import { visibleRows, type Workload } from '../../../packages/bench-contract/src/workload';
const props = defineProps<{ model: Workload }>();
const s = useStore(props.model.state);
const rows = computed(() => visibleRows(s.value));
function input(event: Event) { props.model.query((event.target as HTMLInputElement).value); }
</script>
<template>
  <label for="workload-query">Filter synthetic rows</label><input id="workload-query" type="search" :value="s.query" @input="input" />
  <output id="workload-summary">{{ rows.length }} rows; tick {{ s.tick }}</output>
  <ul id="workload-rows"><li v-for="row in rows" :key="row.id" :data-id="row.id">{{ row.label }}: {{ row.value }}</li></ul>
</template>
