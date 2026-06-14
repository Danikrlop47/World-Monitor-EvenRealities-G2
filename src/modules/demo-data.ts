import type { MonitorModule } from './definitions'

export interface ModuleItem {
  id: string
  title: string
  summary: string
  body: string
  time: string
  location: string
  lat: number
  lon: number
  /** Marker color hint on map */
  color: string
}

const WIRE: ModuleItem[] = [
  {
    id: 'w1', title: 'Air alert in Kyiv', color: '#ef4444',
    summary: 'Air alert declared in Kyiv Oblast. Take shelter.',
    body: 'Air alert declared in Kyiv and Kyiv Oblast at 14:32. Residents advised to proceed to shelters immediately.',
    time: '14:32', location: 'Kyiv, Ukraine', lat: 50.45, lon: 30.52,
  },
  {
    id: 'w2', title: 'M5.4 quake near Tokyo', color: '#a78bfa',
    summary: 'Moderate earthquake off Honshu. No tsunami warning.',
    body: 'Magnitude 5.4 earthquake struck 42 km off eastern Honshu. Shaking intensity 4 reported in Chiba Prefecture.',
    time: '13:18', location: 'Tokyo, Japan', lat: 35.68, lon: 139.69,
  },
  {
    id: 'w3', title: 'Rally in Paris', color: '#f59e0b',
    summary: 'Thousands gather for labor reform protests.',
    body: 'Estimated 12,000 demonstrators at Place de la République. Police report peaceful assembly with minor traffic delays.',
    time: '12:45', location: 'Paris, France', lat: 48.86, lon: 2.35,
  },
  {
    id: 'w4', title: 'Ceasefire talks in Geneva', color: '#ef4444',
    summary: 'Third round of negotiations convenes.',
    body: 'UN mediators opened a third round of ceasefire talks. Both delegations arrived with revised proposals.',
    time: '07:30', location: 'Geneva, CH', lat: 46.2, lon: 6.14,
  },
]

const CHAT: ModuleItem[] = [
  {
    id: 'c1', title: '#osint-europe', color: '#38bdf8',
    summary: '@analyst42: Drone activity reported over Dnipropetrovsk.',
    body: 'Channel #osint-europe · 2.4k online\n\n@analyst42 (14:28): Drone activity reported over Dnipropetrovsk Oblast — alert extended.\n\n@watchdesk (14:15): Satellite pass confirms convoy movement near border sector 7.',
    time: '14:28', location: 'Telegram', lat: 48.46, lon: 35.05,
  },
  {
    id: 'c2', title: '#markets-live', color: '#38bdf8',
    summary: '@fxbot: USD/JPY spikes on BoJ headline risk.',
    body: 'Channel #markets-live · 890 online\n\n@fxbot (11:05): USD/JPY +0.6% in 12 minutes following BoJ official comments on yield curve.',
    time: '11:05', location: 'Telegram', lat: 35.68, lon: 139.69,
  },
  {
    id: 'c3', title: '#quake-watch', color: '#38bdf8',
    summary: '@seismo: Aftershock sequence continues off Honshu.',
    body: 'Channel #quake-watch · 412 online\n\n@seismo (13:22): 3 aftershocks M4.1–M4.4 recorded in past hour. Monitoring continues.',
    time: '13:22', location: 'Telegram', lat: 35.68, lon: 139.69,
  },
]

const STOCKS: ModuleItem[] = [
  {
    id: 's1', title: 'Brent Crude +2.8%', color: '#38bdf8',
    summary: '$84.20 · supply route concerns',
    body: 'Brent crude +2.8% to $84.20/bbl. Energy sector leads European equities. Red Sea shipping risk cited by analysts.',
    time: '11:20', location: 'London', lat: 51.51, lon: -0.13,
  },
  {
    id: 's2', title: 'S&P 500 +0.4%', color: '#38bdf8',
    summary: '4,578 · tech leads gains',
    body: 'S&P 500 +0.4% led by megacap tech. VIX -3.2%. Treasury yields steady ahead of CPI print.',
    time: '15:45', location: 'New York', lat: 40.71, lon: -74.01,
  },
  {
    id: 's3', title: 'Nikkei 225 -0.6%', color: '#38bdf8',
    summary: '38,420 · quake impact priced in',
    body: 'Nikkei 225 -0.6% as insurers weigh quake exposure. Auto supply chain names lower.',
    time: '06:00', location: 'Tokyo', lat: 35.68, lon: 139.69,
  },
]

const CAMERAS: ModuleItem[] = [
  {
    id: 'cam1', title: 'Times Square', color: '#fb923c',
    summary: 'ONLINE · Manhattan, NY',
    body: 'Public webcam: Times Square, Manhattan. Feed status: ONLINE. Night mode active. Last refresh: 2s ago.',
    time: 'LIVE', location: 'New York', lat: 40.76, lon: -73.99,
  },
  {
    id: 'cam2', title: 'Shibuya Crossing', color: '#fb923c',
    summary: 'ONLINE · Tokyo, JP',
    body: 'Public webcam: Shibuya Crossing. Feed status: ONLINE. Pedestrian density: high.',
    time: 'LIVE', location: 'Tokyo', lat: 35.66, lon: 139.7,
  },
  {
    id: 'cam3', title: 'Tower Bridge', color: '#fb923c',
    summary: 'ONLINE · London, UK',
    body: 'Public webcam: Tower Bridge, London. Feed status: ONLINE. Weather: overcast, 12°C.',
    time: 'LIVE', location: 'London', lat: 51.51, lon: -0.08,
  },
  {
    id: 'cam4', title: 'Eiffel Tower', color: '#fb923c',
    summary: 'ONLINE · Paris, FR',
    body: 'Public webcam: Eiffel Tower vista. Feed status: ONLINE. Visibility: good.',
    time: 'LIVE', location: 'Paris', lat: 48.86, lon: 2.29,
  },
]

const DEFCON: ModuleItem[] = [
  {
    id: 'd1', title: 'DEFCON 3', color: '#facc15',
    summary: 'US Strategic Command posture',
    body: 'US DEFCON level: 3 (Round House). Elevated force readiness. NORAD monitoring increased air activity.',
    time: '12:00', location: 'United States', lat: 39.0, lon: -98.0,
  },
  {
    id: 'd2', title: 'NATO alert state', color: '#facc15',
    summary: 'Enhanced vigilance · EU sector',
    body: 'NATO alert state: Enhanced Vigilance. Rapid reaction units at heightened readiness across eastern flank.',
    time: '11:30', location: 'Brussels', lat: 50.85, lon: 4.35,
  },
  {
    id: 'd3', title: 'Pacific fleet status', color: '#facc15',
    summary: 'INDOPACOM · routine patrols',
    body: 'INDOPACOM: Carrier strike group conducting scheduled patrols. No change to regional posture overnight.',
    time: '08:00', location: 'Pacific', lat: 15.0, lon: 145.0,
  },
]

const OUTBREAKS: ModuleItem[] = [
  {
    id: 'o1', title: 'Dengue — São Paulo', color: '#22c55e',
    summary: '+340% cases · 4-week trend',
    body: 'São Paulo state: dengue cases up 340% over 4 weeks. Vector control teams deployed. Hospital capacity adequate.',
    time: '10:05', location: 'São Paulo, BR', lat: -23.55, lon: -46.63,
  },
  {
    id: 'o2', title: 'Cholera — Yemen', color: '#22c55e',
    summary: 'WHO monitoring · 12 districts',
    body: 'WHO reports cholera surveillance active in 12 districts. Clean water delivery expanded in high-risk zones.',
    time: '09:40', location: 'Yemen', lat: 15.35, lon: 44.2,
  },
  {
    id: 'o3', title: 'Mpox — Central Africa', color: '#22c55e',
    summary: '42 new cases · contact tracing',
    body: 'Central Africa cluster: 42 new mpox cases this week. Contact tracing and vaccination campaign underway.',
    time: '08:15', location: 'DRC', lat: -4.32, lon: 15.31,
  },
]

export const MODULE_DATA: Record<MonitorModule, ModuleItem[]> = {
  wire: WIRE,
  chat: CHAT,
  stocks: STOCKS,
  cameras: CAMERAS,
  defcon: DEFCON,
  outbreaks: OUTBREAKS,
}

export function itemsForModule(module: MonitorModule): ModuleItem[] {
  return MODULE_DATA[module]
}
