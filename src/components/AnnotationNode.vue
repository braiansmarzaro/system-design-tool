<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { NodeResizer } from '@vue-flow/node-resizer'

import type { AnnotationData } from '@/domain/diagram'

const props = defineProps<{
  data: AnnotationData
  selected?: boolean
}>()

const emit = defineEmits<{
  resizeEnd: [size: { width: number; height: number }]
  update: [patch: Partial<AnnotationData>]
}>()

const editing = ref(false)
const editor = ref<HTMLTextAreaElement | null>(null)

function recordSize(event: { params: { width: number; height: number } }) {
  props.data.width = Math.round(event.params.width)
  props.data.height = Math.round(event.params.height)
  emit('resizeEnd', { width: props.data.width, height: props.data.height })
}

async function startEditing() {
  if (props.data.kind !== 'rectangle') return
  editing.value = true
  await nextTick()
  editor.value?.focus()
  editor.value?.select()
}

function updateText(event: Event) {
  emit('update', { text: (event.target as HTMLTextAreaElement).value })
}

function finishEditing() {
  editing.value = false
}
</script>

<template>
  <div
    class="annotation-node"
    :class="[`annotation-node--${data.kind}`, { 'annotation-node--selected': selected }]"
    :style="{
      '--annotation-stroke': data.stroke,
      '--annotation-fill': data.fill,
      '--annotation-radius': `${data.radius}px`,
      '--annotation-font-size': `${data.fontSize}px`,
    }"
  >
    <NodeResizer
      :is-visible="selected"
      :min-width="data.kind === 'text' ? 80 : 100"
      :min-height="data.kind === 'text' ? 36 : 64"
      color="#3267d6"
      @resize-end="recordSize"
    />

    <p v-if="data.kind === 'text'">{{ data.text }}</p>

    <div v-else-if="data.kind === 'rectangle'" class="annotation-rectangle" @dblclick.stop="startEditing">
      <textarea
        v-if="editing"
        ref="editor"
        class="annotation-rectangle__editor nodrag nowheel"
        :value="data.text"
        maxlength="160"
        aria-label="Rectangle text"
        @input="updateText"
        @pointerdown.stop
        @keydown.stop
        @keydown.esc.prevent="finishEditing"
        @blur="finishEditing"
      />
      <span v-else-if="data.text">{{ data.text }}</span>
    </div>

    <svg v-else class="annotation-arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 6 88 L 91 14" />
      <path class="annotation-arrow__head" d="M 91 14 L 77 18 L 87 29 Z" />
    </svg>
  </div>
</template>
