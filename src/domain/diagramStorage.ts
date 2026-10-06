import { parseDiagramFile, type DiagramFile } from '@/domain/diagram'

const storageKey = 'system-studio:diagram'
const viewportCookieKey = 'system-studio:viewport'

export interface StoredViewport {
  x: number
  y: number
  zoom: number
}

export function loadStoredDiagram(): DiagramFile | null {
  try {
    const storedDiagram = localStorage.getItem(storageKey)
    return storedDiagram ? parseDiagramFile(JSON.parse(storedDiagram)) : null
  } catch {
    return null
  }
}

export function storeDiagram(diagram: DiagramFile): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(diagram))
    return true
  } catch {
    return false
  }
}

export function loadStoredViewport(): StoredViewport | null {
  try {
    const cookie = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${viewportCookieKey}=`))
    if (!cookie) return null

    const viewport = JSON.parse(decodeURIComponent(cookie.slice(viewportCookieKey.length + 1))) as Partial<StoredViewport>
    return Number.isFinite(viewport.x) && Number.isFinite(viewport.y)
      && Number.isFinite(viewport.zoom) && (viewport.zoom ?? 0) > 0
      ? viewport as StoredViewport
      : null
  } catch {
    return null
  }
}

export function storeViewport(viewport: StoredViewport) {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  document.cookie = `${viewportCookieKey}=${encodeURIComponent(JSON.stringify(viewport))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}