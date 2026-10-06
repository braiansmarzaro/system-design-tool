import { isAnnotation, type AnnotationData, type DiagramFile, type DiagramFileEdge, type DiagramFileNode } from '@/domain/diagram'

const blockWidth = 248
const blockHeight = 112
const canvasPadding = 56

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]!)
}

function ellipsize(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value
}

function fileSafeTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replaceAll(':', '-')
}

function edgeSvg(edge: DiagramFileEdge, nodesById: Map<string, DiagramFileNode>, offsetX: number, offsetY: number): string {
  const source = nodesById.get(edge.source)
  const target = nodesById.get(edge.target)
  if (!source || !target) return ''

  const sourceX = source.position.x + blockWidth - offsetX
  const sourceY = source.position.y + blockHeight / 2 - offsetY
  const targetX = target.position.x - offsetX
  const targetY = target.position.y + blockHeight / 2 - offsetY
  const curve = Math.max(44, Math.abs(targetX - sourceX) * 0.45)
  const lineStyle = edge.lineStyle ?? (edge.animated ? 'animated' : 'solid')
  const styleAttributes = lineStyle === 'dashed'
    ? ' stroke-dasharray="7 6"'
    : lineStyle === 'animated'
      ? ' class="connector-animated" stroke-dasharray="7 6"'
      : ''

  return `<path d="M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}" fill="none" stroke="#78857d" stroke-width="2"${styleAttributes} marker-end="url(#arrow)"/>`
}

function annotationSvg(data: AnnotationData, x: number, y: number): string {
  const stroke = escapeXml(data.stroke)
  const fill = escapeXml(data.fill)

  if (data.kind === 'rectangle') {
    const label = data.text
      ? `<text x="${data.width / 2}" y="${data.height / 2 + data.fontSize * 0.35}" text-anchor="middle" fill="${stroke}" font-family="Arial, sans-serif" font-size="${data.fontSize}">${escapeXml(ellipsize(data.text, 42))}</text>`
      : ''
    return `<g transform="translate(${x} ${y})"><rect width="${data.width}" height="${data.height}" rx="${data.radius}" fill="${fill}" fill-opacity="0.64" stroke="${stroke}" stroke-width="2"/>${label}</g>`
  }

  if (data.kind === 'arrow') {
    return `<g transform="translate(${x} ${y})"><path d="M 8 ${data.height - 8} L ${data.width - 12} 12" fill="none" stroke="${stroke}" stroke-width="3"/><path d="M ${data.width - 12} 12 L ${data.width - 30} 17 L ${data.width - 18} 32 Z" fill="${stroke}"/></g>`
  }

  const text = data.text.split('\n').slice(0, 5)
    .map((line, index) => `<tspan x="0" dy="${index === 0 ? data.fontSize : data.fontSize * 1.25}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<text transform="translate(${x} ${y + data.fontSize})" fill="${stroke}" font-family="Manrope, Arial, sans-serif" font-size="${data.fontSize}" font-weight="600">${text}</text>`
}

function blockSvg(node: DiagramFileNode, offsetX: number, offsetY: number): string {
  const x = node.position.x - offsetX
  const y = node.position.y - offsetY
  const { data } = node
  if (isAnnotation(data)) return annotationSvg(data, x, y)
  const statusColor = data.status === 'healthy' ? '#31a67d' : '#d6932e'
  const label = escapeXml(ellipsize(data.label, 20))
  const description = escapeXml(ellipsize(data.description, 29))
  const providerWidth = data.provider ? Math.min(76, Math.max(42, data.provider.length * 6 + 14)) : 0
  const metricX = data.provider ? 77 + providerWidth : 72
  const metric = escapeXml(ellipsize(data.metric, Math.floor((235 - metricX - 14) / 6)))
  const provider = escapeXml(ellipsize(data.provider ?? '', 10))

  return `<g transform="translate(${x} ${y})">
    <rect width="${blockWidth}" height="${blockHeight}" rx="8" fill="#ffffff" stroke="#dce2dc"/>
    <path d="M 8 1 H 240 A 7 7 0 0 1 247 8" fill="none" stroke="${escapeXml(data.accent)}" stroke-width="3"/>
    <rect x="14" y="16" width="46" height="46" rx="7" fill="${escapeXml(data.tint)}"/>
    <circle cx="37" cy="39" r="10" fill="none" stroke="${escapeXml(data.accent)}" stroke-width="2"/>
    <path d="M 31 39 H 43 M 37 33 V 45" stroke="${escapeXml(data.accent)}" stroke-width="1.5"/>
    <text x="72" y="31" fill="#18211c" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700">${label}</text>
    <circle cx="181" cy="27" r="3" fill="${statusColor}"/>
    <text x="188" y="30" fill="#78837c" font-family="Arial, sans-serif" font-size="8" font-weight="700">${escapeXml(data.status.toUpperCase())}</text>
    <text x="72" y="51" fill="#7a857e" font-family="Arial, sans-serif" font-size="10">${description}</text>
    ${data.provider ? `<rect x="72" y="68" width="${providerWidth}" height="22" rx="4" fill="#edf0ed"/><text x="79" y="83" fill="#536059" font-family="Arial, sans-serif" font-size="9" font-weight="700">${provider}</text>` : ''}
    <rect x="${metricX}" y="68" width="${Math.min(235 - metricX, Math.max(48, metric.length * 6 + 14))}" height="22" rx="4" fill="${escapeXml(data.tint)}"/>
    <text x="${metricX + 7}" y="83" fill="${escapeXml(data.accent)}" font-family="Arial, sans-serif" font-size="9" font-weight="700">${metric}</text>
  </g>`
}

export function createDiagramFile(nodes: DiagramFileNode[], edges: DiagramFileEdge[]): DiagramFile {
  return {
    format: 'system-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: nodes.map((node) => ({
      id: node.id,
      position: { ...node.position },
      data: { ...node.data },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.animated === undefined ? {} : { animated: edge.animated }),
      ...(edge.lineStyle === undefined ? {} : { lineStyle: edge.lineStyle }),
    })),
  }
}

export function createDiagramSvg(diagram: DiagramFile): string {
  if (diagram.nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f4f6f2"/><text x="320" y="180" text-anchor="middle" fill="#68736c" font-family="Arial, sans-serif" font-size="16">Empty System Studio diagram</text></svg>`
  }

  const minX = Math.min(...diagram.nodes.map((node) => node.position.x)) - canvasPadding
  const minY = Math.min(...diagram.nodes.map((node) => node.position.y)) - canvasPadding
  const maxX = Math.max(...diagram.nodes.map((node) => node.position.x + (isAnnotation(node.data) ? node.data.width : blockWidth))) + canvasPadding
  const maxY = Math.max(...diagram.nodes.map((node) => node.position.y + (isAnnotation(node.data) ? node.data.height : blockHeight))) + canvasPadding
  const width = maxX - minX
  const height = maxY - minY
  const nodesById = new Map(diagram.nodes.map((node) => [node.id, node]))
  const edges = diagram.edges.map((edge) => edgeSvg(edge, nodesById, minX, minY)).join('\n  ')
  const blocks = diagram.nodes.map((node) => blockSvg(node, minX, minY)).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">System Studio architecture diagram</title>
  <desc id="description">${diagram.nodes.length} blocks and ${diagram.edges.length} connections</desc>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#78857d"/></marker></defs>
  <style>.connector-animated { animation: connector-flow 0.7s linear infinite; } @keyframes connector-flow { to { stroke-dashoffset: -13; } } @media (prefers-reduced-motion: reduce) { .connector-animated { animation: none; } }</style>
  <rect width="100%" height="100%" fill="#f4f6f2"/>
  ${edges}
  ${blocks}
</svg>`
}

export function downloadTextFile(content: string, type: string, extension: 'json' | 'svg'): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `system-studio-${fileSafeTimestamp()}.${extension}`
  anchor.click()
  URL.revokeObjectURL(url)
}