<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  ConnectionMode,
  MarkerType,
  VueFlow,
  useVueFlow,
  type Connection,
  type Edge,
  type EdgeMouseEvent,
  type Node as FlowNode,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import {
  ChevronDown,
  Copy,
  Database,
  Download,
  FileJson,
  Image,
  Network,
  Plus,
  Save,
  Scan,
  Server,
  Trash2,
  Upload,
} from 'lucide-vue-next'

import AnnotationInspector from '@/components/AnnotationInspector.vue'
import AnnotationNode from '@/components/AnnotationNode.vue'
import BlockInspector from '@/components/BlockInspector.vue'
import ComponentPalette from '@/components/ComponentPalette.vue'
import ConnectorInspector from '@/components/ConnectorInspector.vue'
import SystemBlock from '@/components/SystemBlock.vue'
import WorkspaceToolbar from '@/components/WorkspaceToolbar.vue'
import { blockCatalog, createBlockData } from '@/data/blockCatalog'
import {
  isAnnotation,
  parseDiagramFile,
  type AnnotationData,
  type AnnotationKind,
  type BlockKind,
  type ConnectorStyle,
  type SystemBlockData,
} from '@/domain/diagram'
import { createDiagramFile, createDiagramSvg, downloadTextFile } from '@/domain/diagramExport'
import { loadStoredDiagram, storeDiagram } from '@/domain/diagramStorage'

type DiagramNodeData = SystemBlockData | AnnotationData
type DiagramNode = FlowNode<DiagramNodeData> & { data: DiagramNodeData }
type SystemDiagramNode = DiagramNode & { data: SystemBlockData }
type AnnotationDiagramNode = DiagramNode & { data: AnnotationData }
type CanvasMenu = {
  kind: 'canvas'
  x: number
  y: number
  position: { x: number; y: number }
} | {
  kind: 'node'
  x: number
  y: number
  nodeId: string
}

const initialNodes: DiagramNode[] = [
  { id: 'cdn-1', type: 'systemBlock', position: { x: 90, y: 190 }, data: createBlockData('cdn') },
  {
    id: 'load-balancer-1',
    type: 'systemBlock',
    position: { x: 430, y: 190 },
    data: createBlockData('load-balancer'),
  },
  {
    id: 'database-1',
    type: 'systemBlock',
    position: { x: 770, y: 190 },
    data: createBlockData('database'),
  },
]

const initialEdges: Edge[] = [
  {
    id: 'cdn-to-balancer', source: 'cdn-1', target: 'load-balancer-1', type: 'smoothstep',
    animated: true, data: { lineStyle: 'animated' }, markerEnd: MarkerType.ArrowClosed,
  },
  {
    id: 'balancer-to-database', source: 'load-balancer-1', target: 'database-1',
    type: 'smoothstep', markerEnd: MarkerType.ArrowClosed,
  },
]

const storedDiagram = loadStoredDiagram()
const nodes = shallowRef<DiagramNode[]>(storedDiagram
  ? storedDiagram.nodes.map((node) => ({
      ...node,
      type: isAnnotation(node.data) ? 'annotation' : 'systemBlock',
      ...(isAnnotation(node.data) ? { width: node.data.width, height: node.data.height } : {}),
    }))
  : initialNodes)
const edges = shallowRef<Edge[]>(storedDiagram
  ? storedDiagram.edges.map((edge) => withConnectorStyle({
      ...edge,
      type: 'smoothstep',
      markerEnd: MarkerType.ArrowClosed,
    }, edge.lineStyle ?? (edge.animated ? 'animated' : 'solid')))
  : initialEdges)
const selectedNodeId = ref<string | null>(storedDiagram ? null : 'load-balancer-1')
const selectedEdgeId = ref<string | null>(null)
const connectorPopover = ref<{ x: number; y: number; placement: 'above' | 'below' } | null>(null)
const interactionMode = ref<'select' | 'pan'>('select')
const activeAnnotationTool = ref<AnnotationKind | null>(null)
const rectangleDraft = ref<{
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
} | null>(null)
const nodeSequence = ref(nodes.value.length)
const draggedBlockKind = ref<BlockKind | null>(null)
const dropPreview = ref<{ x: number; y: number } | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const exportMenu = ref<HTMLDetailsElement | null>(null)
const canvasWrap = ref<HTMLElement | null>(null)
const actionMenuElement = ref<HTMLElement | null>(null)
const actionMenu = ref<CanvasMenu | null>(null)
const fileMessage = ref<{ text: string; error: boolean } | null>(null)
const saveState = ref<'saved' | 'saving' | 'error'>('saved')
let messageTimeout: ReturnType<typeof setTimeout> | undefined
let saveTimeout: ReturnType<typeof setTimeout> | undefined
const { viewport, screenToFlowCoordinate, zoomIn, zoomOut, fitView } = useVueFlow()

const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value))
const selectedBlock = computed<SystemDiagramNode | undefined>(() => {
  const node = selectedNode.value
  return node && !isAnnotation(node.data) ? node as SystemDiagramNode : undefined
})
const selectedAnnotation = computed<AnnotationDiagramNode | undefined>(() => {
  const node = selectedNode.value
  return node && isAnnotation(node.data) ? node as AnnotationDiagramNode : undefined
})
const selectedEdge = computed(() => edges.value.find((edge) => edge.id === selectedEdgeId.value))
const blockCount = computed(() => nodes.value.filter((node) => !isAnnotation(node.data)).length)
const annotationCount = computed(() => nodes.value.filter((node) => isAnnotation(node.data)).length)
const selectedConnectorStyle = computed<ConnectorStyle>(() => {
  const lineStyle = selectedEdge.value?.data?.lineStyle
  return lineStyle === 'dashed' || lineStyle === 'animated' ? lineStyle : 'solid'
})

function withConnectorStyle(edge: Edge, lineStyle: ConnectorStyle): Edge {
  return {
    ...edge,
    animated: lineStyle === 'animated',
    style: lineStyle === 'dashed' ? { strokeDasharray: '7 6' } : undefined,
    data: { ...edge.data, lineStyle },
  }
}

function isBlockKind(value: string): value is BlockKind {
  return blockCatalog.some((block) => block.kind === value)
}

function addBlock(kind: BlockKind, position?: { x: number; y: number }) {
  nodeSequence.value += 1
  const offset = nodeSequence.value * 24
  const id = `${kind}-${crypto.randomUUID()}`

  nodes.value = [...nodes.value, {
    id,
    type: 'systemBlock',
    position: position ?? { x: 320 + offset, y: 90 + offset },
    data: createBlockData(kind),
  }]
  selectedNodeId.value = id
}

function insertAnnotation(
  kind: AnnotationKind,
  position?: { x: number; y: number },
  customDimensions?: { width: number; height: number },
) {
  const bounds = canvasWrap.value?.getBoundingClientRect()
  const center = bounds
    ? screenToFlowCoordinate({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
    : { x: 440, y: 260 }
  const dimensions = customDimensions ?? (kind === 'text'
    ? { width: 220, height: 64 }
    : kind === 'rectangle'
      ? { width: 260, height: 160 }
      : { width: 220, height: 100 })
  const stagger = (annotationCount.value % 6) * 24
  const id = `annotation-${kind}-${crypto.randomUUID()}`
  const data: AnnotationData = {
    nodeType: 'annotation',
    kind,
    text: kind === 'text' ? 'Add a note' : '',
    stroke: '#26342d',
    fill: kind === 'rectangle' ? 'transparent' : '#fff5c2',
    fontSize: kind === 'text' ? 20 : 15,
    radius: 16,
    ...dimensions,
  }

  nodes.value = [...nodes.value, {
    id,
    type: 'annotation',
    position: position ?? {
      x: center.x - dimensions.width / 2 + stagger,
      y: center.y - dimensions.height / 2 + stagger,
    },
    width: dimensions.width,
    height: dimensions.height,
    data,
  }]
  selectedNodeId.value = id
  selectedEdgeId.value = null
}

function addAnnotation(kind: AnnotationKind) {
  if (kind === 'rectangle') {
    activeAnnotationTool.value = activeAnnotationTool.value === 'rectangle' ? null : 'rectangle'
    rectangleDraft.value = null
    clearSelection()
    return
  }

  activeAnnotationTool.value = null
  insertAnnotation(kind)
}

function handleCanvasPointerDown(event: PointerEvent) {
  if (activeAnnotationTool.value !== 'rectangle' || event.button !== 0) return
  const target = event.target
  if (!(target instanceof Element) || target.closest('.vue-flow__node, .canvas-toolbar, .action-menu')) return

  event.preventDefault()
  event.stopPropagation()
  const bounds = canvasWrap.value?.getBoundingClientRect()
  if (!bounds) return
  rectangleDraft.value = {
    pointerId: event.pointerId,
    startX: event.clientX - bounds.left,
    startY: event.clientY - bounds.top,
    currentX: event.clientX - bounds.left,
    currentY: event.clientY - bounds.top,
  }
  canvasWrap.value?.setPointerCapture(event.pointerId)
}

function handleCanvasPointerMove(event: PointerEvent) {
  if (!rectangleDraft.value || rectangleDraft.value.pointerId !== event.pointerId) return
  const bounds = canvasWrap.value?.getBoundingClientRect()
  if (!bounds) return
  rectangleDraft.value = {
    ...rectangleDraft.value,
    currentX: event.clientX - bounds.left,
    currentY: event.clientY - bounds.top,
  }
}

function finishRectangle(event: PointerEvent) {
  const draft = rectangleDraft.value
  if (!draft || draft.pointerId !== event.pointerId) return
  canvasWrap.value?.releasePointerCapture(event.pointerId)
  rectangleDraft.value = null
  activeAnnotationTool.value = null

  const bounds = canvasWrap.value?.getBoundingClientRect()
  if (!bounds || Math.abs(draft.currentX - draft.startX) < 8 || Math.abs(draft.currentY - draft.startY) < 8) return

  const start = screenToFlowCoordinate({ x: bounds.left + draft.startX, y: bounds.top + draft.startY })
  const end = screenToFlowCoordinate({ x: bounds.left + draft.currentX, y: bounds.top + draft.currentY })
  const position = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) }
  insertAnnotation('rectangle', position, {
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  })
}

function cancelRectangle(event: PointerEvent) {
  if (!rectangleDraft.value || rectangleDraft.value.pointerId !== event.pointerId) return
  canvasWrap.value?.releasePointerCapture(event.pointerId)
  rectangleDraft.value = null
  activeAnnotationTool.value = null
}

const rectangleDraftStyle = computed(() => {
  const draft = rectangleDraft.value
  if (!draft) return {}
  return {
    left: `${Math.min(draft.startX, draft.currentX)}px`,
    top: `${Math.min(draft.startY, draft.currentY)}px`,
    width: `${Math.abs(draft.currentX - draft.startX)}px`,
    height: `${Math.abs(draft.currentY - draft.startY)}px`,
  }
})

function handleConnect(connection: Connection) {
  if (!connection.source || !connection.target) return

  edges.value = [...edges.value, {
    id: `${connection.source}-${connection.target}-${crypto.randomUUID()}`,
    ...connection,
    source: connection.source,
    target: connection.target,
    type: 'smoothstep',
    markerEnd: MarkerType.ArrowClosed,
  }]
}

function handleDrop(event: DragEvent) {
  const kind = event.dataTransfer?.getData('application/system-block') ?? ''
  if (!isBlockKind(kind)) return

  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  addBlock(kind, { x: position.x - 120, y: position.y - 55 })
  clearDragPreview()
}

function updateDragPreview(event: DragEvent) {
  if (!draggedBlockKind.value) return
  const canvas = event.currentTarget as HTMLElement
  const bounds = canvas.getBoundingClientRect()
  dropPreview.value = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
}

function clearDragPreview() {
  draggedBlockKind.value = null
  dropPreview.value = null
}

function menuCoordinates(event: MouseEvent) {
  const bounds = canvasWrap.value?.getBoundingClientRect()
  if (!bounds) return { x: event.clientX, y: event.clientY }

  return {
    x: Math.min(Math.max(event.clientX - bounds.left, 10), bounds.width - 220),
    y: Math.min(Math.max(event.clientY - bounds.top, 10), bounds.height - 210),
  }
}

function selectNodeById(nodeId: string) {
  selectedNodeId.value = nodeId
  selectedEdgeId.value = null
  connectorPopover.value = null
  actionMenu.value = null
}

function selectNode({ node }: NodeMouseEvent) {
  selectNodeById(node.id)
}

function openNodeMenu({ event, node }: NodeMouseEvent) {
  if (!(event instanceof MouseEvent)) return
  event.preventDefault()
  const coordinates = menuCoordinates(event)
  selectedNodeId.value = node.id
  selectedEdgeId.value = null
  actionMenu.value = { kind: 'node', ...coordinates, nodeId: node.id }
}

function selectEdge({ event, edge }: EdgeMouseEvent) {
  if (!(event instanceof MouseEvent)) return
  const bounds = canvasWrap.value?.getBoundingClientRect()
  if (!bounds) return

  selectedEdgeId.value = edge.id
  selectedNodeId.value = null
  connectorPopover.value = {
    x: Math.min(Math.max(event.clientX - bounds.left, 132), bounds.width - 132),
    y: event.clientY - bounds.top,
    placement: event.clientY - bounds.top > 150 ? 'above' : 'below',
  }
  actionMenu.value = null
}

function clearSelection() {
  selectedNodeId.value = null
  selectedEdgeId.value = null
  connectorPopover.value = null
  actionMenu.value = null
}

function openCanvasMenu(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element) || target.closest('.vue-flow__node, .vue-flow__edge, .vue-flow__minimap, .canvas-toolbar, .action-menu')) return

  event.preventDefault()
  const coordinates = menuCoordinates(event)
  selectedNodeId.value = null
  selectedEdgeId.value = null
  actionMenu.value = {
    kind: 'canvas',
    ...coordinates,
    position: screenToFlowCoordinate({ x: event.clientX, y: event.clientY }),
  }
}

function addBlockFromMenu(kind: BlockKind) {
  if (actionMenu.value?.kind !== 'canvas') return
  const { position } = actionMenu.value
  addBlock(kind, { x: position.x - 124, y: position.y - 56 })
  actionMenu.value = null
}

function fitCanvasFromMenu() {
  actionMenu.value = null
  fitView({ padding: 0.22, duration: 280 })
}

function duplicateNodeFromMenu() {
  if (actionMenu.value?.kind !== 'node') return
  selectedNodeId.value = actionMenu.value.nodeId
  duplicateSelectedNode()
  actionMenu.value = null
}

function removeNodeFromMenu() {
  if (actionMenu.value?.kind !== 'node') return
  selectedNodeId.value = actionMenu.value.nodeId
  removeSelectedNode()
  actionMenu.value = null
}

function updateSelectedBlock(patch: Partial<SystemBlockData>) {
  if (!selectedNodeId.value) return
  nodes.value = nodes.value.map((node) => node.id === selectedNodeId.value && !isAnnotation(node.data)
    ? { ...node, data: { ...node.data, ...patch } }
    : node)
}

function updateSelectedAnnotation(patch: Partial<AnnotationData>) {
  if (!selectedNodeId.value) return
  updateAnnotation(selectedNodeId.value, patch)
}

function updateAnnotation(id: string, patch: Partial<AnnotationData>) {
  nodes.value = nodes.value.map((node) => node.id === id && isAnnotation(node.data)
    ? {
        ...node,
        ...(patch.width === undefined ? {} : { width: patch.width }),
        ...(patch.height === undefined ? {} : { height: patch.height }),
        data: { ...node.data, ...patch },
      }
    : node)
}

function updateAnnotationSize(id: string, size: { width: number; height: number }) {
  nodes.value = nodes.value.map((node) => node.id === id && isAnnotation(node.data)
    ? { ...node, ...size, data: { ...node.data, ...size } }
    : node)
}

function updateSelectedEdge(lineStyle: ConnectorStyle) {
  if (!selectedEdgeId.value) return
  edges.value = edges.value.map((edge) => edge.id === selectedEdgeId.value
    ? withConnectorStyle(edge, lineStyle)
    : edge)
}

function removeSelectedNode() {
  if (!selectedNodeId.value) return
  const nodeId = selectedNodeId.value
  nodes.value = nodes.value.filter((node) => node.id !== nodeId)
  edges.value = edges.value.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
  selectedNodeId.value = null
}

function removeSelectedEdge() {
  if (!selectedEdgeId.value) return
  edges.value = edges.value.filter((edge) => edge.id !== selectedEdgeId.value)
  selectedEdgeId.value = null
}

function duplicateSelectedNode() {
  const node = selectedNode.value
  if (!node) return

  const id = isAnnotation(node.data)
    ? `annotation-${node.data.kind}-${crypto.randomUUID()}`
    : `${node.data.kind}-${crypto.randomUUID()}`
  nodes.value = [...nodes.value, {
    ...node,
    id,
    position: { x: node.position.x + 36, y: node.position.y + 36 },
    data: isAnnotation(node.data)
      ? { ...node.data }
      : { ...node.data, label: `${node.data.label} copy` },
  }]
  selectedNodeId.value = id
}

function currentDiagram() {
  return createDiagramFile(
    nodes.value.map((node) => ({
      id: node.id,
      position: node.position,
      data: node.data,
      ...(isAnnotation(node.data) ? { width: node.data.width, height: node.data.height } : {}),
    })),
    edges.value.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(typeof edge.animated === 'boolean' ? { animated: edge.animated } : {}),
      lineStyle: (edge.data?.lineStyle as ConnectorStyle | undefined)
        ?? (edge.animated ? 'animated' : 'solid'),
    })),
  )
}

function saveDiagram() {
  clearTimeout(saveTimeout)
  saveState.value = storeDiagram(currentDiagram()) ? 'saved' : 'error'
}

function scheduleSave() {
  clearTimeout(saveTimeout)
  saveState.value = 'saving'
  saveTimeout = setTimeout(saveDiagram, 300)
}

function closeExportMenu() {
  if (exportMenu.value) exportMenu.value.open = false
}

function showFileMessage(text: string, error = false) {
  clearTimeout(messageTimeout)
  fileMessage.value = { text, error }
  messageTimeout = setTimeout(() => { fileMessage.value = null }, 4000)
}

function exportJson() {
  downloadTextFile(JSON.stringify(currentDiagram(), null, 2), 'application/json', 'json')
  closeExportMenu()
  showFileMessage('JSON exported')
}

function exportSvg() {
  downloadTextFile(createDiagramSvg(currentDiagram()), 'image/svg+xml', 'svg')
  closeExportMenu()
  showFileMessage('SVG exported')
}

function chooseImportFile() {
  closeExportMenu()
  importInput.value?.click()
}

async function importJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const diagram = parseDiagramFile(JSON.parse(await file.text()))
    nodes.value = diagram.nodes.map((node) => ({
      ...node,
      type: isAnnotation(node.data) ? 'annotation' : 'systemBlock',
      ...(isAnnotation(node.data) ? { width: node.data.width, height: node.data.height } : {}),
    }))
    edges.value = diagram.edges.map((edge) => withConnectorStyle({
        ...edge,
        type: 'smoothstep',
        markerEnd: MarkerType.ArrowClosed,
      }, edge.lineStyle ?? (edge.animated ? 'animated' : 'solid')))
    selectedNodeId.value = null
    selectedEdgeId.value = null
    nodeSequence.value = nodes.value.length
    await nextTick()
    fitView({ padding: 0.22, duration: 280 })
    showFileMessage(`Imported ${nodes.value.length} blocks and ${edges.value.length} connections`)
  } catch (error) {
    showFileMessage(error instanceof Error ? error.message : 'Could not import this file.', true)
  }
}

function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.matches('input, textarea, select') || target.isContentEditable) return
  if (event.key === 'Escape') {
    actionMenu.value = null
    activeAnnotationTool.value = null
    rectangleDraft.value = null
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedNodeId.value) {
    event.preventDefault()
    duplicateSelectedNode()
    actionMenu.value = null
    return
  }
  if (event.key !== 'Delete' && event.key !== 'Backspace') return

  if (selectedEdgeId.value) {
    event.preventDefault()
    removeSelectedEdge()
  } else if (selectedNodeId.value) {
    event.preventDefault()
    removeSelectedNode()
  }
}

function closeActionMenu(event: PointerEvent) {
  if (!(event.target instanceof Node) || !actionMenuElement.value?.contains(event.target)) {
    actionMenu.value = null
  }
}

watch([nodes, edges], scheduleSave, { deep: true })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('pointerdown', closeActionMenu)
  window.addEventListener('beforeunload', saveDiagram)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('pointerdown', closeActionMenu)
  window.removeEventListener('beforeunload', saveDiagram)
  clearTimeout(messageTimeout)
  saveDiagram()
})
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark"><Network :size="20" :stroke-width="2" /></span>
        <div><strong>System Studio</strong><span>Architecture workspace</span></div>
      </div>

      <div class="document-title">
        <span class="document-title__dot" />
        <strong>Commerce platform</strong>
        <span class="document-title__tag">Draft</span>
      </div>

      <div class="topbar__actions">
        <span class="save-state" role="status">
          <Save :size="14" />
          {{ saveState === 'saving' ? 'Saving locally...' : saveState === 'error' ? 'Local save failed' : 'Saved locally' }}
        </span>
        <details ref="exportMenu" class="export-menu">
          <summary class="export-button" aria-label="Export and import" title="Export and import"><Download :size="16" /><span>Export</span><ChevronDown :size="13" /></summary>
          <div class="export-menu__panel">
            <button type="button" @click="exportJson">
              <FileJson :size="17" /><span><strong>Export JSON</strong><small>Editable project file</small></span>
            </button>
            <button type="button" @click="exportSvg">
              <Image :size="17" /><span><strong>Export SVG</strong><small>Shareable vector image</small></span>
            </button>
            <span class="export-menu__divider" />
            <button type="button" @click="chooseImportFile">
              <Upload :size="17" /><span><strong>Import JSON</strong><small>Replace the current diagram</small></span>
            </button>
          </div>
        </details>
        <input ref="importInput" class="sr-only" type="file" accept="application/json,.json" @change="importJson">
      </div>
    </header>

    <section class="workspace">
      <ComponentPalette
        @add="addBlock"
        @drag-start="draggedBlockKind = $event"
        @drag-end="clearDragPreview"
      />

      <div
        ref="canvasWrap"
        class="canvas-wrap"
        :class="{ 'canvas-wrap--drawing': activeAnnotationTool === 'rectangle' }"
        @dragover.prevent="updateDragPreview"
        @dragleave.self="dropPreview = null"
        @drop="handleDrop"
        @dblclick.capture="openCanvasMenu"
        @pointerdown.capture="handleCanvasPointerDown"
        @pointermove="handleCanvasPointerMove"
        @pointerup="finishRectangle"
        @pointercancel="cancelRectangle"
      >
        <div class="canvas-caption"><span>Production</span><strong>Request path</strong></div>

        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          class="diagram-canvas"
          :default-viewport="{ x: 20, y: 60, zoom: 1 }"
          :min-zoom="0.35"
          :max-zoom="1.8"
          :connection-mode="ConnectionMode.Loose"
          :snap-to-grid="true"
          :snap-grid="[16, 16]"
          :pan-on-drag="interactionMode === 'pan' && !activeAnnotationTool"
          :selection-key-code="interactionMode === 'select'"
          :zoom-on-double-click="false"
          @connect="handleConnect"
          @node-click="selectNode"
          @node-double-click="openNodeMenu"
          @node-context-menu="openNodeMenu"
          @node-drag-stop="saveDiagram"
          @edge-click="selectEdge"
          @pane-click="clearSelection"
          @pane-context-menu="openCanvasMenu"
        >
          <Background pattern-color="#c8cec8" :gap="24" :size="1" />
          <template #node-systemBlock="nodeProps">
            <SystemBlock v-bind="nodeProps" @pointerdown="selectNodeById(nodeProps.id)" />
          </template>
          <template #node-annotation="nodeProps">
            <AnnotationNode
              v-bind="nodeProps"
              @pointerdown="selectNodeById(nodeProps.id)"
              @resize-end="updateAnnotationSize(nodeProps.id, $event)"
              @update="updateAnnotation(nodeProps.id, $event)"
            />
          </template>
          <MiniMap
            class="diagram-minimap"
            :pannable="true"
            :zoomable="true"
            mask-color="rgba(244, 246, 242, 0.72)"
            node-color="#8d9890"
          />
        </VueFlow>

        <div v-if="rectangleDraft" class="rectangle-draft" :style="rectangleDraftStyle" aria-hidden="true" />

        <Transition name="action-menu">
          <div
            v-if="actionMenu"
            ref="actionMenuElement"
            class="action-menu"
            :style="{ left: `${actionMenu.x}px`, top: `${actionMenu.y}px` }"
            role="menu"
            :aria-label="actionMenu.kind === 'node' ? 'Block actions' : 'Canvas actions'"
          >
            <template v-if="actionMenu.kind === 'node'">
              <span class="action-menu__label">Block actions</span>
              <button type="button" role="menuitem" @click="duplicateNodeFromMenu">
                <Copy :size="16" /><span>Duplicate</span><kbd>Ctrl D</kbd>
              </button>
              <button class="action-menu__danger" type="button" role="menuitem" @click="removeNodeFromMenu">
                <Trash2 :size="16" /><span>Delete</span><kbd>Del</kbd>
              </button>
            </template>
            <template v-else>
              <span class="action-menu__label">Add at this point</span>
              <button type="button" role="menuitem" @click="addBlockFromMenu('load-balancer')">
                <Plus :size="16" /><span>Load balancer</span>
              </button>
              <button type="button" role="menuitem" @click="addBlockFromMenu('database')">
                <Database :size="16" /><span>Database</span>
              </button>
              <button type="button" role="menuitem" @click="addBlockFromMenu('aws-ec2')">
                <Server :size="16" /><span>Compute</span>
              </button>
              <span class="action-menu__divider" />
              <button type="button" role="menuitem" @click="fitCanvasFromMenu">
                <Scan :size="16" /><span>Fit diagram</span>
              </button>
            </template>
          </div>
        </Transition>

        <div
          v-if="draggedBlockKind && dropPreview"
          class="drop-preview"
          :style="{ left: `${dropPreview.x}px`, top: `${dropPreview.y}px` }"
          aria-hidden="true"
        >
          <span class="drop-preview__accent" :style="{ background: createBlockData(draggedBlockKind).accent }" />
          <div>
            <strong>{{ createBlockData(draggedBlockKind).label }}</strong>
            <span>{{ createBlockData(draggedBlockKind).description }}</span>
          </div>
        </div>

        <WorkspaceToolbar
          :zoom="viewport.zoom"
          :mode="interactionMode"
          :active-annotation-tool="activeAnnotationTool"
          @set-mode="interactionMode = $event"
          @add-annotation="addAnnotation"
          @zoom-in="zoomIn({ duration: 200 })"
          @zoom-out="zoomOut({ duration: 200 })"
          @fit-view="fitView({ padding: 0.22, duration: 280 })"
        />

        <div class="canvas-status" aria-live="polite">
          <span>{{ blockCount }} blocks</span><span>{{ annotationCount }} annotations</span><span>{{ edges.length }} connections</span>
        </div>

        <Transition name="connector-popover">
          <ConnectorInspector
            v-if="selectedEdge && connectorPopover"
            :line-style="selectedConnectorStyle"
            :class="`connector-popover--${connectorPopover.placement}`"
            :style="{ left: `${connectorPopover.x}px`, top: `${connectorPopover.y}px` }"
            @update="updateSelectedEdge"
            @close="clearSelection"
            @remove="removeSelectedEdge"
          />
        </Transition>
      </div>

      <Transition name="file-message">
        <div
          v-if="fileMessage"
          class="file-message"
          :class="{ 'file-message--error': fileMessage.error }"
          role="status"
        >
          {{ fileMessage.text }}
        </div>
      </Transition>

      <Transition name="inspector-slide">
        <BlockInspector
          v-if="selectedBlock"
          :data="selectedBlock.data"
          @update="updateSelectedBlock"
          @close="clearSelection"
          @duplicate="duplicateSelectedNode"
          @remove="removeSelectedNode"
        />
      </Transition>
      <Transition name="inspector-slide">
        <AnnotationInspector
          v-if="selectedAnnotation"
          :data="selectedAnnotation.data"
          @update="updateSelectedAnnotation"
          @close="clearSelection"
          @duplicate="duplicateSelectedNode"
          @remove="removeSelectedNode"
        />
      </Transition>
    </section>
  </main>
</template>
