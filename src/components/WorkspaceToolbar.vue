<script setup lang="ts">
import { ArrowUpRight, Focus, Hand, MousePointer2, Redo2, Square, Type, Undo2, ZoomIn, ZoomOut } from 'lucide-vue-next'

import type { AnnotationKind } from '@/domain/diagram'

defineProps<{
  zoom: number
  mode: 'select' | 'pan'
  activeAnnotationTool: AnnotationKind | null
}>()

const emit = defineEmits<{
  setMode: [mode: 'select' | 'pan']
  zoomIn: []
  zoomOut: []
  fitView: []
  addAnnotation: [kind: AnnotationKind]
}>()
</script>

<template>
  <div class="canvas-toolbar" aria-label="Canvas tools">
    <div class="toolbar-group toolbar-group--mode" aria-label="Interaction mode">
      <button
        type="button"
        class="icon-button"
        :class="{ 'icon-button--active': mode === 'select' }"
        aria-label="Select tool"
        title="Select"
        :aria-pressed="mode === 'select'"
        @click="emit('setMode', 'select')"
      >
        <MousePointer2 :size="17" />
      </button>
      <button
        type="button"
        class="icon-button"
        :class="{ 'icon-button--active': mode === 'pan' }"
        aria-label="Pan tool"
        title="Pan"
        :aria-pressed="mode === 'pan'"
        @click="emit('setMode', 'pan')"
      >
        <Hand :size="17" />
      </button>
    </div>

    <span class="toolbar-divider" />

    <div class="toolbar-group" aria-label="Annotation tools">
      <button type="button" class="icon-button" aria-label="Add text annotation" title="Add text" @click="emit('addAnnotation', 'text')">
        <Type :size="17" />
      </button>
      <button
        type="button"
        class="icon-button"
        :class="{ 'icon-button--active': activeAnnotationTool === 'rectangle' }"
        aria-label="Draw rounded rectangle"
        title="Draw rectangle"
        :aria-pressed="activeAnnotationTool === 'rectangle'"
        @click="emit('addAnnotation', 'rectangle')"
      >
        <Square :size="17" />
      </button>
      <button type="button" class="icon-button" aria-label="Add arrow annotation" title="Add arrow" @click="emit('addAnnotation', 'arrow')">
        <ArrowUpRight :size="17" />
      </button>
    </div>

    <span class="toolbar-divider" />

    <div class="toolbar-group toolbar-group--history" aria-label="History">
      <button type="button" class="icon-button" aria-label="Undo" title="Undo" disabled>
        <Undo2 :size="17" />
      </button>
      <button type="button" class="icon-button" aria-label="Redo" title="Redo" disabled>
        <Redo2 :size="17" />
      </button>
    </div>

    <span class="toolbar-divider" />

    <div class="toolbar-group" aria-label="Zoom controls">
      <button type="button" class="icon-button" aria-label="Zoom out" title="Zoom out" @click="emit('zoomOut')">
        <ZoomOut :size="17" />
      </button>
      <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
      <button type="button" class="icon-button" aria-label="Zoom in" title="Zoom in" @click="emit('zoomIn')">
        <ZoomIn :size="17" />
      </button>
      <button type="button" class="icon-button" aria-label="Fit diagram to view" title="Fit view" @click="emit('fitView')">
        <Focus :size="17" />
      </button>
    </div>
  </div>
</template>
