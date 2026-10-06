<script setup lang="ts">
import { computed, ref } from 'vue'
import { GripVertical, Search } from 'lucide-vue-next'

import { blockCatalog } from '@/data/blockCatalog'
import { blockIcons } from '@/data/blockIcons'
import type { BlockKind } from '@/domain/diagram'

const emit = defineEmits<{
  add: [kind: BlockKind]
  dragStart: [kind: BlockKind]
  dragEnd: []
}>()

const searchQuery = ref('')
const filteredBlocks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return blockCatalog

  return blockCatalog.filter((block) => [
    block.name,
    block.description,
    block.category,
    block.kind,
  ].some((value) => value.toLocaleLowerCase().includes(query)))
})
const catalogGroups = computed(() => (['Core', 'External', 'AWS'] as const)
  .map((category) => ({
    category,
    blocks: filteredBlocks.value.filter((block) => block.category === category),
  }))
  .filter((group) => group.blocks.length > 0))

function startDrag(event: DragEvent, kind: BlockKind) {
  if (!event.dataTransfer) return

  event.dataTransfer.setData('application/system-block', kind)
  event.dataTransfer.effectAllowed = 'move'
  emit('dragStart', kind)
}
</script>

<template>
  <aside class="palette" aria-label="Component library">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Library</span>
        <h2>Components</h2>
      </div>
      <span class="panel-count">{{ filteredBlocks.length }}</span>
    </div>

    <label class="palette-search">
      <Search :size="15" aria-hidden="true" />
      <span class="sr-only">Search components</span>
      <input v-model="searchQuery" type="search" placeholder="Search" autocomplete="off" />
    </label>

    <section v-for="group in catalogGroups" :key="group.category" class="palette-group">
      <p class="palette-section-label">{{ group.category }}</p>

      <div class="palette-list">
        <button
          v-for="block in group.blocks"
          :key="block.kind"
          type="button"
          class="palette-item"
          draggable="true"
          :style="{ '--item-accent': block.accent, '--item-tint': block.tint }"
          :aria-label="`Add ${block.name} (double-click)`"
          @dblclick="emit('add', block.kind)"
          @keydown.enter.prevent="emit('add', block.kind)"
          @dragstart="startDrag($event, block.kind)"
          @dragend="emit('dragEnd')"
        >
          <span class="palette-item__icon">
            <component :is="blockIcons[block.kind]" :size="19" :stroke-width="1.8" />
          </span>
          <span class="palette-item__copy">
            <strong>{{ block.name }}</strong>
            <small>{{ block.description }}</small>
          </span>
          <GripVertical class="palette-item__grip" :size="16" aria-hidden="true" />
        </button>
      </div>
    </section>

    <p v-if="filteredBlocks.length === 0" class="palette-hint">No matching components</p>
    <p v-else class="palette-hint">Drag to canvas or double-click to add</p>
  </aside>
</template>
