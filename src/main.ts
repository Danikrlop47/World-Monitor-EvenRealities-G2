import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { mountCompanionUi } from './companion-ui'
import { MonitorState } from './monitor-state'
import { GlassesHud } from './glasses-hud'
import { warmMapRenderCache } from './map/render-map'
import { startGlobeRotation } from './map/globe-rotation'

warmMapRenderCache()
startGlobeRotation()

const bridge = await waitForEvenAppBridge()
const monitor = new MonitorState()

let latest = monitor.getSnapshot()

const hud = new GlassesHud(bridge, {
  scrollOlder: () => monitor.scrollOlder(),
  scrollNewer: () => monitor.scrollNewer(),
  glassesTap: () => monitor.glassesTap(),
  glassesTapFeedRow: listIndex => monitor.glassesTapFeedRow(listIndex),
  glassesGoBack: () => monitor.glassesGoBack(),
  setPickerIndex: index => monitor.setPickerIndex(index),
  setFeedIndex: index => monitor.setFeedIndex(index),
  openSelectedModule: () => monitor.openSelectedModule(),
  isHomeMenu: () => monitor.getSnapshot().overlay === 'none',
  isModuleFeed: () => monitor.getSnapshot().overlay === 'module',
  getFeedItems: () => monitor.getItems(),
  getFeedIndex: () => monitor.getSnapshot().feedListIndex,
})

await hud.ensurePage()
const unbindHud = hud.bindEvents()
const unbindGlobe = hud.bindGlobeRotation()

void hud.forceRenderMap(latest, monitor.getItems())

monitor.subscribe(snapshot => {
  latest = snapshot
  void hud.sync(snapshot, monitor.getItems())
})

const appRoot = document.querySelector<HTMLElement>('#app')
if (appRoot) mountCompanionUi(monitor, appRoot)

console.log('[app] World Monitor ready — native list menu on glasses')

window.addEventListener('beforeunload', () => {
  unbindHud()
  unbindGlobe()
})
