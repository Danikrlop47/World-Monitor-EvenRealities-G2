import type { WorldEvent } from '../types'

export const DEMO_EVENTS: WorldEvent[] = [
  {
    id: '1',
    category: 'conflict',
    title: 'Air alert declared in Kyiv',
    summary: 'Air alert declared in Kyiv and Kyiv Oblast. Residents advised to take shelter.',
    body:
      'Air alert declared in Kyiv and Kyiv Oblast at 14:32 local time. ' +
      'Residents are advised to proceed to the nearest shelter immediately. ' +
      'Multiple regions across central Ukraine are affected. ' +
      'Emergency services remain on standby. Follow official channels for all-clear updates.',
    location: 'Kyiv, Ukraine',
    lat: 50.45,
    lon: 30.52,
    time: '14:32',
  },
  {
    id: '2',
    category: 'earthquake',
    title: 'M5.4 earthquake near Tokyo',
    summary: 'Moderate earthquake detected off the coast of Honshu. No tsunami warning issued.',
    body:
      'A magnitude 5.4 earthquake struck 42 km off the eastern coast of Honshu, Japan at 13:18 JST. ' +
      'The Japan Meteorological Agency reports shaking intensity of 4 in parts of Chiba Prefecture. ' +
      'No tsunami warning has been issued. Rail services briefly suspended for inspection.',
    location: 'Tokyo, Japan',
    lat: 35.68,
    lon: 139.69,
    time: '13:18',
  },
  {
    id: '3',
    category: 'protest',
    title: 'Mass rally in central Paris',
    summary: 'Thousands gather at Place de la République for labor reform protests.',
    body:
      'An estimated 12,000 demonstrators gathered at Place de la République in Paris on Sunday afternoon. ' +
      'Organizers cite proposed labor reforms as the primary grievance. ' +
      'Police report peaceful assembly with minor traffic disruptions along Boulevard Saint-Martin. ' +
      'Metro lines 3, 5, and 8 experienced delays near the protest route.',
    location: 'Paris, France',
    lat: 48.86,
    lon: 2.35,
    time: '12:45',
  },
  {
    id: '4',
    category: 'market',
    title: 'Oil futures spike on supply fears',
    summary: 'Brent crude rises 2.8% amid Middle East shipping route concerns.',
    body:
      'Brent crude futures climbed 2.8% in early trading, reaching $84.20 per barrel. ' +
      'Analysts attribute the move to heightened concerns over shipping routes in the Red Sea corridor. ' +
      'Energy sector equities led gains on European exchanges. ' +
      'OPEC+ delegates are scheduled to meet next week to review production quotas.',
    location: 'London, UK',
    lat: 51.51,
    lon: -0.13,
    time: '11:20',
  },
  {
    id: '5',
    category: 'outbreak',
    title: 'Dengue cases rise in São Paulo',
    summary: 'Health authorities report 340% increase in dengue cases over four weeks.',
    body:
      'São Paulo state health authorities report a 340% increase in confirmed dengue cases over the past four weeks. ' +
      'Municipal vector control teams have been deployed to high-incidence neighborhoods. ' +
      'Residents are urged to eliminate standing water and use repellent. ' +
      'Hospital capacity remains adequate but officials warn of strain if trends continue.',
    location: 'São Paulo, Brazil',
    lat: -23.55,
    lon: -46.63,
    time: '10:05',
  },
  {
    id: '6',
    category: 'general',
    title: 'ISS crew conducts spacewalk',
    summary: 'NASA astronauts complete 6.5-hour EVA to upgrade station solar arrays.',
    body:
      'NASA astronauts completed a 6.5-hour extravehicular activity to upgrade solar array hardware on the International Space Station. ' +
      'The spacewalk began at 08:14 UTC and concluded without incident. ' +
      'Mission control confirmed all primary objectives were achieved. ' +
      'The next scheduled EVA is planned for late next month.',
    location: 'Low Earth Orbit',
    lat: 0,
    lon: 0,
    time: '08:14',
  },
  {
    id: '7',
    category: 'conflict',
    title: 'Ceasefire talks resume in Geneva',
    summary: 'Mediators convene third round of negotiations between regional parties.',
    body:
      'United Nations mediators convened a third round of ceasefire negotiations in Geneva on Saturday. ' +
      'Both delegations arrived with revised proposals following back-channel discussions. ' +
      'A spokesperson described the atmosphere as cautiously constructive. ' +
      'Talks are expected to continue through the weekend with a press briefing scheduled for Monday.',
    location: 'Geneva, Switzerland',
    lat: 46.2,
    lon: 6.14,
    time: '07:30',
  },
]

export function formatListItem(event: WorldEvent): string {
  return `${event.time} ${event.location.split(',')[0]}`
}

export function formatEventHeadline(event: WorldEvent): string {
  return truncateForGlasses(event.summary, 80)
}

function truncateForGlasses(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export { truncateForGlasses }
