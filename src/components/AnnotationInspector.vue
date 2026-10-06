<script setup lang="ts">
import { Copy, Trash2, X } from 'lucide-vue-next'

import type { AnnotationData } from '@/domain/diagram'

defineProps<{
  data: AnnotationData
}>()

const emit = defineEmits<{
  update: [patch: Partial<AnnotationData>]
  close: []
  duplicate: []
  remove: []
}>()

function updateText(event: Event) {
  emit('update', { text: (event.target as HTMLTextAreaElement).value })
}

function updateColor(field: 'stroke' | 'fill', event: Event) {
  emit('update', { [field]: (event.target as HTMLInputElement).value })
}

function updateFillTransparency(event: Event) {
  const transparent = (event.target as HTMLInputElement).checked
  emit('update', { fill: transparent ? 'transparent' : '#fff5c2' })
}

function updateNumber(field: 'fontSize' | 'radius', event: Event) {
  emit('update', { [field]: Number((event.target as HTMLInputElement).value) })
}
</script>

<template>
  <aside class="inspector" aria-label="Annotation inspector">
    <div class="panel-heading inspector__heading">
      <div>
        <span class="eyebrow">Selected annotation</span>
        <h2>Appearance</h2>
      </div>
      <button type="button" class="icon-button" aria-label="Close inspector" title="Close" @click="emit('close')">
        <X :size="17" />
      </button>
    </div>

    <div class="annotation-inspector__type">{{ data.kind }}</div>

    <div class="inspector__fields">
      <label v-if="data.kind !== 'arrow'" class="field">
        <span>Text</span>
        <textarea :value="data.text" maxlength="160" rows="4" @input="updateText" />
      </label>

      <label class="field color-field">
        <span>{{ data.kind === 'text' ? 'Text color' : 'Stroke color' }}</span>
        <input type="color" :value="data.stroke" @input="updateColor('stroke', $event)" />
        <code>{{ data.stroke }}</code>
      </label>

      <label v-if="data.kind === 'rectangle'" class="transparency-toggle">
        <input type="checkbox" :checked="data.fill === 'transparent'" @change="updateFillTransparency" />
        <span>Transparent fill</span>
      </label>

      <label v-if="data.kind === 'rectangle' && data.fill !== 'transparent'" class="field color-field">
        <span>Fill color</span>
        <input type="color" :value="data.fill" @input="updateColor('fill', $event)" />
        <code>{{ data.fill }}</code>
      </label>

      <label v-if="data.kind !== 'arrow'" class="field">
        <span>Font size</span>
        <input type="range" min="12" max="36" step="1" :value="data.fontSize" @input="updateNumber('fontSize', $event)" />
      </label>

      <label v-if="data.kind === 'rectangle'" class="field">
        <span>Corner radius</span>
        <input type="range" min="0" max="32" step="1" :value="data.radius" @input="updateNumber('radius', $event)" />
      </label>
    </div>

    <div class="inspector__actions">
      <button type="button" class="secondary-button" @click="emit('duplicate')"><Copy :size="15" />Duplicate</button>
      <button type="button" class="danger-button" @click="emit('remove')"><Trash2 :size="15" />Delete</button>
    </div>
  </aside>
</template>