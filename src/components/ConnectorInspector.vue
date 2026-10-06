<script setup lang="ts">
import { Trash2, X } from 'lucide-vue-next'

import type { ConnectorStyle } from '@/domain/diagram'

defineProps<{
  lineStyle: ConnectorStyle
}>()

const emit = defineEmits<{
  update: [lineStyle: ConnectorStyle]
  close: []
  remove: []
}>()

const styles: { value: ConnectorStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'animated', label: 'Animated' },
]
</script>

<template>
  <div class="connector-popover" role="dialog" aria-label="Connection style" @pointerdown.stop @click.stop>
    <div class="connector-popover__header">
      <strong>Arrow style</strong>
      <div>
        <button type="button" class="connector-popover__icon" aria-label="Delete connection" title="Delete connection" @click="emit('remove')">
          <Trash2 :size="15" />
        </button>
        <button type="button" class="connector-popover__icon" aria-label="Close" title="Close" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>
    </div>

    <div class="connector-style-control">
      <button
        v-for="style in styles"
        :key="style.value"
        type="button"
        :class="{ 'is-active': lineStyle === style.value }"
        :aria-pressed="lineStyle === style.value"
        @click="emit('update', style.value)"
      >
        <span class="connector-style-control__sample" :class="`connector-style-control__sample--${style.value}`" />
        {{ style.label }}
      </button>
    </div>
  </div>
</template>