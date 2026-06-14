import { MODULES } from './definitions'
import type { MonitorSnapshot } from '../monitor-state'
import { truncate } from '../types'

/** G2 textContainerUpgrade content limit */
const GLASSES_TEXT_MAX = 2000

/** Labels for the native G2 list menu (glasses home picker). */
export function moduleListItemNames(): string[] {
  return MODULES.map(m => `${m.num} ${m.label}`)
}

export function formatModuleOverlay(snapshot: MonitorSnapshot): string {
  const { item, index, total, moduleLabel } = snapshot

  return [
    `[ ${moduleLabel} ]`,
    `${index + 1}/${total}`,
    '',
    truncate(item.title, 54),
    `${item.time}  ${truncate(item.location.split(',')[0], 28)}`,
    '',
    truncate(item.summary, 170),
    '',
    'Scroll = browse  ·  Tap = full text  ·  Scroll up = back',
  ].join('\n')
}

export function formatDetailOverlay(snapshot: MonitorSnapshot): string {
  const { item, moduleLabel } = snapshot
  const header = [
    '<< TAP BACK',
    '',
    `${moduleLabel}`,
    truncate(item.location, 52),
    truncate(item.title, 56),
    '',
  ].join('\n')

  return (header + item.body).slice(0, GLASSES_TEXT_MAX)
}

export function formatPopOverlay(snapshot: MonitorSnapshot): string {
  if (snapshot.overlay === 'module') return formatModuleOverlay(snapshot)
  return formatDetailOverlay(snapshot)
}

export function formatGlassesPanel(snapshot: MonitorSnapshot): string {
  if (snapshot.overlay === 'module') return formatModuleOverlay(snapshot)
  return formatDetailOverlay(snapshot)
}
