import { MODULES } from './definitions'
import type { ModuleItem } from './demo-data'
import type { MonitorSnapshot } from '../monitor-state'
import { truncate } from '../types'

/** G2 textContainerUpgrade content limit */
const GLASSES_TEXT_MAX = 2000

/** G2 list item name limit */
const LIST_ITEM_MAX = 64

/** Labels for the native G2 list menu (glasses home picker). */
export function moduleListItemNames(): string[] {
  return MODULES.map(m => `${m.num} ${m.label}`)
}

export const FEED_BACK_ROW_LABEL = '← BACK'

/** Back row + one row per feed item — same native list style as the home module menu. */
export function moduleFeedItemNames(items: ModuleItem[]): string[] {
  const rows = items.map((item, i) => {
    const latest = i === 0 ? ' · latest' : ''
    return truncate(`${item.time}${latest}  ${item.title}`, LIST_ITEM_MAX)
  })
  return [FEED_BACK_ROW_LABEL, ...rows]
}

export function isFeedBackRow(listIndex: number): boolean {
  return listIndex === 0
}

export function isFeedBackListEvent(listEvent: { currentSelectItemName?: string }): boolean {
  return listEvent.currentSelectItemName === FEED_BACK_ROW_LABEL
}

export function feedListIndexToItemIndex(listIndex: number): number {
  return listIndex - 1
}

export function formatDetailOverlay(snapshot: MonitorSnapshot): string {
  const { item, moduleLabel } = snapshot
  const header = [
    moduleLabel,
    `${item.time} · ${truncate(item.location, 48)}`,
    '',
    truncate(item.title, 56),
    '',
  ].join('\n')

  return (header + item.body).slice(0, GLASSES_TEXT_MAX)
}

export function formatGlassesPanel(snapshot: MonitorSnapshot): string {
  return formatDetailOverlay(snapshot)
}
