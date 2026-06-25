export type MonitorModule =
  | 'wire'
  | 'chat'
  | 'stocks'
  | 'cameras'
  | 'defcon'
  | 'outbreaks'

export interface ModuleDefinition {
  id: MonitorModule
  num: number
  label: string
  short: string
}

export const MODULES: ModuleDefinition[] = [
  { id: 'wire', num: 1, label: 'WIRE', short: 'WR' },
  { id: 'chat', num: 2, label: 'CHAT', short: 'CH' },
  { id: 'stocks', num: 3, label: 'STOCKS', short: 'ST' },
  { id: 'cameras', num: 4, label: 'CAMERAS', short: 'CM' },
  { id: 'defcon', num: 5, label: 'DEFCON', short: 'DF' },
  { id: 'outbreaks', num: 6, label: 'OUTBREAKS', short: 'OB' },
]

export function moduleById(id: MonitorModule): ModuleDefinition {
  return MODULES.find(m => m.id === id) ?? MODULES[0]
}

export function nextModule(id: MonitorModule): MonitorModule {
  const i = MODULES.findIndex(m => m.id === id)
  return MODULES[(i + 1) % MODULES.length].id
}

export function prevModule(id: MonitorModule): MonitorModule {
  const i = MODULES.findIndex(m => m.id === id)
  return MODULES[(i - 1 + MODULES.length) % MODULES.length].id
}
