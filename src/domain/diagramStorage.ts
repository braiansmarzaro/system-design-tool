import { parseDiagramFile, type DiagramFile } from '@/domain/diagram'

const storageKey = 'system-studio:diagram'

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