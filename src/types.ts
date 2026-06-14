export type EventCategory =
  | 'conflict'
  | 'protest'
  | 'earthquake'
  | 'outbreak'
  | 'market'
  | 'general'

export interface WorldEvent {
  id: string
  category: EventCategory
  title: string
  summary: string
  body: string
  location: string
  lat: number
  lon: number
  time: string
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  conflict: 'CONFLICT',
  protest: 'PROTEST',
  earthquake: 'QUAKE',
  outbreak: 'OUTBREAK',
  market: 'MARKET',
  general: 'NEWS',
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  conflict: '#ef4444',
  protest: '#f59e0b',
  earthquake: '#a78bfa',
  outbreak: '#22c55e',
  market: '#38bdf8',
  general: '#94a3b8',
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}
