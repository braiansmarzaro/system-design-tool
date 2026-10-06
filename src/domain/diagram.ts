export type BlockKind =
  | 'cdn'
  | 'load-balancer'
  | 'database'
  | 'nosql'
  | 'compute'
  | 'serverless-function'
  | 'object-storage'
  | 'api-gateway'
  | 'container'
  | 'message-queue'
  | 'cache'
  | 'user'
  | 'external-service'
  | 'external-api'
  | 'aws-lambda'
  | 'aws-ec2'
  | 'aws-s3'
  | 'aws-api-gateway'
  | 'aws-ecs'
  | 'aws-rds'
  | 'aws-dynamodb'
  | 'aws-sqs'
  | 'aws-cloudfront'
  | 'aws-elasticache'

export type BlockCategory = 'Core' | 'External' | 'AWS'

export type BlockStatus = 'healthy' | 'warning'

export type AnnotationKind = 'text' | 'rectangle' | 'arrow'

export type ConnectorStyle = 'solid' | 'dashed' | 'animated'

export interface AnnotationData extends Record<string, unknown> {
  nodeType: 'annotation'
  kind: AnnotationKind
  text: string
  stroke: string
  fill: string
  fontSize: number
  radius: number
  width: number
  height: number
}

export interface BlockVariant {
  id: string
  name: string
  label?: string
  description?: string
  metric?: string
  accent?: string
  tint?: string
}

export interface BlockDefinition {
  kind: BlockKind
  canvasKind?: BlockKind
  category: BlockCategory
  name: string
  description: string
  accent: string
  tint: string
  defaultMetric: string
  defaultProvider: string
  variants?: BlockVariant[]
}

export interface SystemBlockData extends Record<string, unknown> {
  kind: BlockKind
  label: string
  description: string
  accent: string
  tint: string
  metric: string
  status: BlockStatus
  provider?: string
}

export interface DiagramFileNode {
  id: string
  position: { x: number; y: number }
  data: SystemBlockData | AnnotationData
  width?: number
  height?: number
}

export interface DiagramFileEdge {
  id: string
  source: string
  target: string
  animated?: boolean
  lineStyle?: ConnectorStyle
}

export interface DiagramFile {
  format: 'system-studio'
  version: 1
  exportedAt: string
  nodes: DiagramFileNode[]
  edges: DiagramFileEdge[]
}

const blockKinds: BlockKind[] = [
  'cdn', 'load-balancer', 'database', 'nosql', 'compute', 'serverless-function',
  'object-storage', 'api-gateway', 'container', 'message-queue', 'cache', 'user',
  'external-service', 'external-api', 'aws-lambda', 'aws-ec2', 'aws-s3',
  'aws-api-gateway', 'aws-ecs', 'aws-rds', 'aws-dynamodb', 'aws-sqs', 'aws-cloudfront',
  'aws-elasticache',
]
const blockStatuses: BlockStatus[] = ['healthy', 'warning']
const legacyBlockAliases: Partial<Record<BlockKind, { kind: BlockKind; provider: string }>> = {
  'aws-lambda': { kind: 'serverless-function', provider: 'AWS Lambda' },
  'aws-ec2': { kind: 'compute', provider: 'Amazon EC2' },
  'aws-s3': { kind: 'object-storage', provider: 'Amazon S3' },
  'aws-api-gateway': { kind: 'api-gateway', provider: 'Amazon API Gateway' },
  'aws-ecs': { kind: 'container', provider: 'Amazon ECS' },
  'aws-rds': { kind: 'database', provider: 'Amazon RDS' },
  'aws-dynamodb': { kind: 'nosql', provider: 'DynamoDB' },
  'aws-sqs': { kind: 'message-queue', provider: 'Amazon SQS' },
  'aws-cloudfront': { kind: 'cdn', provider: 'Amazon CloudFront' },
  'aws-elasticache': { kind: 'cache', provider: 'Amazon ElastiCache' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBlockData(value: unknown): value is SystemBlockData {
  if (!isRecord(value)) return false

  return blockKinds.includes(value.kind as BlockKind)
    && typeof value.label === 'string'
    && typeof value.description === 'string'
    && typeof value.accent === 'string'
    && typeof value.tint === 'string'
    && typeof value.metric === 'string'
    && (value.provider === undefined || typeof value.provider === 'string')
    && blockStatuses.includes(value.status as BlockStatus)
}

function isAnnotationData(value: unknown): value is AnnotationData {
  if (!isRecord(value)) return false

  return value.nodeType === 'annotation'
    && ['text', 'rectangle', 'arrow'].includes(value.kind as AnnotationKind)
    && typeof value.text === 'string'
    && typeof value.stroke === 'string'
    && typeof value.fill === 'string'
    && isFiniteNumber(value.fontSize)
    && isFiniteNumber(value.radius)
    && isFiniteNumber(value.width)
    && isFiniteNumber(value.height)
}

export function isAnnotation(value: SystemBlockData | AnnotationData): value is AnnotationData {
  return value.nodeType === 'annotation'
}

export function parseDiagramFile(value: unknown): DiagramFile {
  if (!isRecord(value) || value.format !== 'system-studio' || value.version !== 1) {
    throw new Error('This is not a supported System Studio file.')
  }
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error('The diagram must contain blocks and connections.')
  }

  const nodes = value.nodes.map((node, index) => {
    if (!isRecord(node) || typeof node.id !== 'string' || !isRecord(node.position)
      || !isFiniteNumber(node.position.x) || !isFiniteNumber(node.position.y)
      || (!isBlockData(node.data) && !isAnnotationData(node.data))
      || (node.width !== undefined && !isFiniteNumber(node.width))
      || (node.height !== undefined && !isFiniteNumber(node.height))) {
      throw new Error(`Block ${index + 1} is invalid.`)
    }

    const alias = isBlockData(node.data) ? legacyBlockAliases[node.data.kind] : undefined
    const data = alias && isBlockData(node.data)
      ? {
          ...node.data,
          kind: alias.kind,
          provider: !node.data.provider || node.data.provider === 'AWS'
            ? alias.provider
            : node.data.provider,
        }
      : node.data

    return {
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data,
      ...(node.width === undefined ? {} : { width: node.width }),
      ...(node.height === undefined ? {} : { height: node.height }),
    }
  })

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = value.edges.map((edge, index) => {
    if (!isRecord(edge) || typeof edge.id !== 'string' || typeof edge.source !== 'string'
      || typeof edge.target !== 'string' || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
      || (edge.animated !== undefined && typeof edge.animated !== 'boolean')
      || (edge.lineStyle !== undefined && !['solid', 'dashed', 'animated'].includes(edge.lineStyle as string))) {
      throw new Error(`Connection ${index + 1} is invalid.`)
    }

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.animated === undefined ? {} : { animated: edge.animated }),
      ...(edge.lineStyle === undefined ? {} : { lineStyle: edge.lineStyle as ConnectorStyle }),
    }
  })

  return {
    format: 'system-studio',
    version: 1,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    nodes,
    edges,
  }
}
