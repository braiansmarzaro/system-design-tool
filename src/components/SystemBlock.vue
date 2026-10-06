<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

import { blockIcons } from '@/data/blockIcons'
import type { SystemBlockData } from '@/domain/diagram'

const props = defineProps<{
  data: SystemBlockData
  selected?: boolean
}>()

const icon = computed(() => blockIcons[props.data.kind])
</script>

<template>
  <article
    class="system-block"
    :class="{ 'system-block--selected': selected }"
    :style="{ '--block-accent': data.accent, '--block-tint': data.tint }"
  >
    <Handle type="target" :position="Position.Left" class="system-block__handle" />

    <div class="system-block__icon" aria-hidden="true">
      <component :is="icon" :size="22" :stroke-width="1.8" />
    </div>

    <div class="system-block__content">
      <div class="system-block__heading">
        <strong>{{ data.label }}</strong>
        <span class="system-block__status">
          <span class="system-block__status-dot" />
          {{ data.status }}
        </span>
      </div>
      <p>{{ data.description }}</p>
      <div class="system-block__metadata">
        <span v-if="data.provider" class="system-block__provider">{{ data.provider }}</span>
        <span class="system-block__metric">{{ data.metric }}</span>
      </div>
    </div>

    <Handle type="source" :position="Position.Right" class="system-block__handle" />
  </article>
</template>