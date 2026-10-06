<script setup lang="ts">
import { computed } from 'vue'
import { Copy, Trash2, X } from 'lucide-vue-next'

import { getBlockDefinition } from '@/data/blockCatalog'
import type { BlockStatus, SystemBlockData } from '@/domain/diagram'

const props = defineProps<{
  data: SystemBlockData
}>()

const definition = computed(() => getBlockDefinition(props.data.kind))
const variants = computed(() => definition.value.variants ?? [])

const emit = defineEmits<{
  update: [patch: Partial<SystemBlockData>]
  close: []
  duplicate: []
  remove: []
}>()

function updateText(field: 'label' | 'description' | 'metric', event: Event) {
  const target = event.target as HTMLInputElement
  emit('update', { [field]: target.value })
}

function updateStatus(status: BlockStatus) {
  emit('update', { status })
}

function updateProvider(event: Event) {
  const target = event.target as HTMLSelectElement
  const variant = variants.value.find((option) => option.id === target.value)
  if (!variant) return

  const currentVariant = variants.value.find((option) => option.name === props.data.provider)
  const hasDefaultLabel = props.data.label === (currentVariant?.label ?? definition.value.name)

  emit('update', {
    provider: variant.name,
    ...(hasDefaultLabel ? { label: variant.label ?? definition.value.name } : {}),
    description: variant.description ?? definition.value.description,
    metric: variant.metric ?? definition.value.defaultMetric,
    accent: variant.accent ?? definition.value.accent,
    tint: variant.tint ?? definition.value.tint,
  })
}
</script>

<template>
  <aside class="inspector" aria-label="Block inspector">
    <div class="panel-heading inspector__heading">
      <div>
        <span class="eyebrow">Selected block</span>
        <h2>Properties</h2>
      </div>
      <button type="button" class="icon-button" aria-label="Close inspector" title="Close" @click="emit('close')">
        <X :size="17" />
      </button>
    </div>

    <div class="inspector__preview" :style="{ '--preview-accent': data.accent, '--preview-tint': data.tint }">
      <span class="inspector__preview-mark" />
      <div>
        <strong>{{ data.label || 'Untitled block' }}</strong>
        <small>{{ data.kind }}</small>
      </div>
    </div>

    <div class="inspector__fields">
      <label v-if="variants.length" class="field">
        <span>Provider / engine</span>
        <select
          :value="variants.find((variant) => variant.name === data.provider)?.id"
          @change="updateProvider"
        >
          <option v-for="variant in variants" :key="variant.id" :value="variant.id">
            {{ variant.name }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Name</span>
        <input :value="data.label" maxlength="40" @input="updateText('label', $event)" />
      </label>

      <label class="field">
        <span>Description</span>
        <input :value="data.description" maxlength="72" @input="updateText('description', $event)" />
      </label>

      <label class="field">
        <span>Metric</span>
        <input :value="data.metric" maxlength="24" @input="updateText('metric', $event)" />
      </label>

      <div class="field">
        <span>Status</span>
        <div class="segmented-control">
          <button
            v-for="status in (['healthy', 'warning'] as BlockStatus[])"
            :key="status"
            type="button"
            :class="{ 'is-active': data.status === status }"
            @click="updateStatus(status)"
          >
            {{ status }}
          </button>
        </div>
      </div>
    </div>

    <div class="inspector__actions">
      <button type="button" class="secondary-button" @click="emit('duplicate')">
        <Copy :size="15" />
        Duplicate
      </button>
      <button type="button" class="danger-button" @click="emit('remove')">
        <Trash2 :size="15" />
        Delete
      </button>
    </div>
  </aside>
</template>