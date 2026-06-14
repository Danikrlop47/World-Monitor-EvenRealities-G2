import {
  EvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
  TextContainerUpgrade,
  ImageContainerProperty,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  OsEventTypeList,
  type EvenHubEvent,
  type List_ItemEvent,
} from '@evenrealities/even_hub_sdk'
import {
  INFO_PANEL_H,
  INFO_PANEL_W,
  MAP_TILE_H,
  MAP_TILE_W,
  MAP_X,
  POP_WINDOW_BORDER,
  POP_WINDOW_H,
  POP_WINDOW_RADIUS,
  POP_WINDOW_W,
  POP_WINDOW_X,
  POP_WINDOW_Y,
} from './layout/display'
import { MODULES } from './modules/definitions'
import type { MonitorSnapshot } from './monitor-state'
import { formatPopOverlay, moduleListItemNames } from './modules/format-glasses'
import { mapItemsKey, renderMapTiles, tilesEqual } from './map/render-map'
import type { ModuleItem } from './modules/demo-data'

const LIST_CONTAINER_ID = 6
const INFO_CONTAINER_ID = 6
const MAP_TILE_IDS = [2, 3, 4, 5] as const
const MAP_TILE_NAMES = ['tile-tl', 'tile-tr', 'tile-bl', 'tile-br'] as const

export interface MonitorScrollHandlers {
  scrollOlder: () => void
  scrollNewer: () => void
  glassesTap: () => void
  setPickerIndex: (index: number) => void
  openSelectedModule: () => void
  isHomeMenu: () => boolean
}

function normalizeEventType(raw: unknown): OsEventTypeList | undefined {
  if (raw === undefined || raw === null) return undefined
  return OsEventTypeList.fromJson(raw)
}

function resolveListIndex(listEvent: List_ItemEvent): number | undefined {
  if (
    listEvent.currentSelectItemIndex !== undefined &&
    listEvent.currentSelectItemIndex !== null
  ) {
    return listEvent.currentSelectItemIndex
  }

  const name = listEvent.currentSelectItemName
  if (!name) return undefined

  const byLabel = MODULES.findIndex(m => `${m.num} ${m.label}` === name)
  if (byLabel >= 0) return byLabel

  return MODULES.findIndex(m => m.label === name)
}

function resolveEventType(event: EvenHubEvent): OsEventTypeList | undefined {
  const fromList = normalizeEventType(event.listEvent?.eventType)
  if (fromList !== undefined) return fromList

  const fromText = normalizeEventType(event.textEvent?.eventType)
  if (fromText !== undefined) return fromText

  const fromSys = normalizeEventType(event.sysEvent?.eventType)
  if (fromSys !== undefined) return fromSys

  const json = event.jsonData as { eventType?: unknown; eventSource?: unknown } | undefined
  const fromJson = normalizeEventType(json?.eventType)
  if (fromJson !== undefined) return fromJson

  if (
    event.sysEvent?.eventSource != null &&
    event.sysEvent.eventType == null &&
    !event.sysEvent.imuData
  ) {
    return OsEventTypeList.CLICK_EVENT
  }

  if (
    json?.eventSource != null &&
    json.eventType == null &&
    !event.textEvent &&
    !event.listEvent
  ) {
    return OsEventTypeList.CLICK_EVENT
  }

  return undefined
}

export class GlassesHud {
  private pageReady = false
  private overlayLayoutOpen = false
  private mapFlushPromise: Promise<void> | null = null
  private pendingMapKey: string | null = null
  private pendingMapItems: ModuleItem[] = []
  private pendingMapIndex = 0
  private forceNextMapFlush = false
  private uiQueue: Promise<void> = Promise.resolve()
  private lastMapKey = ''
  private lastPanelKey = ''
  private lastMapTiles: (Uint8Array | null)[] = [null, null, null, null]

  constructor(
    private bridge: EvenAppBridge,
    private scrollHandlers: MonitorScrollHandlers,
  ) {}

  /** Native Even Realities list menu on the left column. */
  private moduleList() {
    return new ListContainerProperty({
      xPosition: 0,
      yPosition: 0,
      width: INFO_PANEL_W,
      height: INFO_PANEL_H,
      borderWidth: 1,
      borderColor: 5,
      borderRadius: 4,
      paddingLength: 4,
      containerID: LIST_CONTAINER_ID,
      containerName: 'mod-menu',
      itemContainer: new ListItemContainerProperty({
        itemCount: MODULES.length,
        itemWidth: 0,
        isItemSelectBorderEn: 1,
        itemName: moduleListItemNames(),
      }),
      isEventCapture: 1,
    })
  }

  /** Full-screen pop-forward module window. */
  private popPanel() {
    return new TextContainerProperty({
      xPosition: POP_WINDOW_X,
      yPosition: POP_WINDOW_Y,
      width: POP_WINDOW_W,
      height: POP_WINDOW_H,
      borderWidth: POP_WINDOW_BORDER,
      borderColor: 11,
      borderRadius: POP_WINDOW_RADIUS,
      paddingLength: 3,
      containerID: INFO_CONTAINER_ID,
      containerName: 'info-feed',
      content: ' ',
      isEventCapture: 1,
    })
  }

  private mapTiles() {
    const mapTilePositions = [
      { x: MAP_X, y: 0 },
      { x: MAP_X + MAP_TILE_W, y: 0 },
      { x: MAP_X, y: MAP_TILE_H },
      { x: MAP_X + MAP_TILE_W, y: MAP_TILE_H },
    ]

    return MAP_TILE_IDS.map((id, i) =>
      new ImageContainerProperty({
        xPosition: mapTilePositions[i].x,
        yPosition: mapTilePositions[i].y,
        width: MAP_TILE_W,
        height: MAP_TILE_H,
        containerID: id,
        containerName: MAP_TILE_NAMES[i],
      }),
    )
  }

  async init(): Promise<void> {
    const result = await this.bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 5,
        listObject: [this.moduleList()],
        imageObject: this.mapTiles(),
      }),
    )

    this.pageReady = result === 0
    this.overlayLayoutOpen = false
    console.log('[hud] page created:', this.pageReady ? 'ok' : `failed (${result})`)
  }

  async rebuild(): Promise<void> {
    const ok = await this.bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 5,
        listObject: [this.moduleList()],
        imageObject: this.mapTiles(),
      }),
    )

    this.pageReady = ok
    this.overlayLayoutOpen = false
    this.lastPanelKey = ''
    this.lastMapKey = ''
    this.lastMapTiles = [null, null, null, null]
    console.log('[hud] page rebuilt:', ok ? 'ok' : 'failed')
  }

  private async rebuildForOverlay(open: boolean): Promise<void> {
    if (open) {
      const ok = await this.bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 1,
          textObject: [this.popPanel()],
        }),
      )
      if (!ok) console.warn('[hud] overlay rebuild failed')
    } else {
      const ok = await this.bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 5,
          listObject: [this.moduleList()],
          imageObject: this.mapTiles(),
        }),
      )
      if (!ok) console.warn('[hud] home rebuild failed')
      this.lastMapKey = ''
      this.lastMapTiles = [null, null, null, null]
      this.forceNextMapFlush = true
    }

    this.overlayLayoutOpen = open
    this.lastPanelKey = ''
  }

  async ensurePage(): Promise<void> {
    await this.init()
    if (!this.pageReady) await this.rebuild()
  }

  sync(snapshot: MonitorSnapshot, items: ModuleItem[]): Promise<void> {
    this.uiQueue = this.uiQueue.then(async () => {
      if (!this.pageReady) return
      await this.renderPanel(snapshot)
      if (snapshot.overlay === 'none') {
        await this.renderMapInner(snapshot, items)
      }
    })
    return this.uiQueue
  }

  renderMap(snapshot: MonitorSnapshot, items: ModuleItem[]): Promise<void> {
    return this.sync(snapshot, items)
  }

  private async renderMapInner(snapshot: MonitorSnapshot, items: ModuleItem[]): Promise<void> {
    if (snapshot.overlay !== 'none') return

    const mapKey = mapItemsKey(snapshot.module, items, snapshot.index)
    if (mapKey === this.lastMapKey && !this.pendingMapKey) return

    this.pendingMapKey = mapKey
    this.pendingMapItems = items
    this.pendingMapIndex = snapshot.index
    await this.scheduleMapFlush()
  }

  private scheduleMapFlush(): Promise<void> {
    if (!this.mapFlushPromise) {
      this.mapFlushPromise = this.flushPendingMap().finally(() => {
        this.mapFlushPromise = null
        if (this.pendingMapKey) void this.scheduleMapFlush()
      })
    }
    return this.mapFlushPromise
  }

  private async flushPendingMap(): Promise<void> {
    while (this.pendingMapKey) {
      const mapKey = this.pendingMapKey
      const items = this.pendingMapItems
      const index = this.pendingMapIndex
      this.pendingMapKey = null
      const forceAllTiles = this.forceNextMapFlush
      this.forceNextMapFlush = false

      if (!forceAllTiles && mapKey === this.lastMapKey) continue

      try {
        const tiles = await renderMapTiles(items, index)
        await this.uploadMapTilesSequential(tiles, forceAllTiles)
        this.lastMapKey = mapKey
      } catch (err) {
        console.warn('[hud] map render failed:', err)
      }
    }
  }

  private async uploadMapTilesSequential(
    tiles: Uint8Array[],
    forceAllTiles: boolean,
  ): Promise<void> {
    for (let i = 0; i < tiles.length; i++) {
      await this.uploadMapTile(i, tiles[i], forceAllTiles)
    }
  }

  private async uploadMapTile(
    index: number,
    tile: Uint8Array,
    forceAllTiles: boolean,
  ): Promise<void> {
    if (!forceAllTiles && tilesEqual(tile, this.lastMapTiles[index])) return

    this.lastMapTiles[index] = tile
    const result = await this.bridge.updateImageRawData(
      new ImageRawDataUpdate({
        containerID: MAP_TILE_IDS[index],
        containerName: MAP_TILE_NAMES[index],
        imageData: tile,
      }),
    )
    if (result !== ImageRawDataUpdateResult.success) {
      console.warn(`[hud] ${MAP_TILE_NAMES[index]} update failed:`, result)
    }
  }

  async forceRenderMap(snapshot: MonitorSnapshot, items: ModuleItem[]): Promise<void> {
    if (!this.pageReady) return

    this.lastMapKey = ''
    this.lastMapTiles = [null, null, null, null]
    this.forceNextMapFlush = true
    await this.sync(snapshot, items)
  }

  private async upgradePopContainer(snapshot: MonitorSnapshot): Promise<void> {
    const popText = formatPopOverlay(snapshot)
    const contentOffset = snapshot.overlay === 'detail' ? snapshot.detailScrollOffset : 0

    const ok = await this.bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: INFO_CONTAINER_ID,
        containerName: 'info-feed',
        contentOffset,
        contentLength: popText.length,
        content: popText,
      }),
    )
    if (!ok) console.warn('[hud] pop layer upgrade failed')
  }

  private async renderPanel(snapshot: MonitorSnapshot): Promise<void> {
    const overlayOpen = snapshot.overlay !== 'none'

    if (overlayOpen !== this.overlayLayoutOpen) {
      await this.rebuildForOverlay(overlayOpen)
    }

    if (!overlayOpen) return

    const panelKey = [
      snapshot.overlay,
      snapshot.module,
      snapshot.index,
      snapshot.detailScrollOffset,
    ].join('|')

    if (panelKey === this.lastPanelKey) return
    this.lastPanelKey = panelKey

    await this.upgradePopContainer(snapshot)
  }

  bindEvents(): () => void {
    let lastEventAt = 0
    const DEBOUNCE_MS = 250

    const handleListEvent = (event: EvenHubEvent): void => {
      if (!this.scrollHandlers.isHomeMenu() || !event.listEvent) return

      const listEvent = event.listEvent
      const type = normalizeEventType(listEvent.eventType)
      const index = resolveListIndex(listEvent)

      if (index !== undefined) {
        this.scrollHandlers.setPickerIndex(index)
      }

      if (
        type === OsEventTypeList.SCROLL_TOP_EVENT ||
        type === OsEventTypeList.SCROLL_BOTTOM_EVENT
      ) {
        return
      }

      if (type === OsEventTypeList.CLICK_EVENT || type === undefined) {
        this.scrollHandlers.openSelectedModule()
      }
    }

    const handleType = (type: OsEventTypeList | undefined): void => {
      if (type == null) return

      const now = Date.now()
      if (now - lastEventAt < DEBOUNCE_MS) return
      lastEventAt = now

      if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
        void this.bridge.shutDownPageContainer(1)
        return
      }

      if (this.scrollHandlers.isHomeMenu()) return

      if (type === OsEventTypeList.CLICK_EVENT) {
        this.scrollHandlers.glassesTap()
        return
      }

      if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
        this.scrollHandlers.scrollOlder()
        return
      }

      if (type === OsEventTypeList.SCROLL_TOP_EVENT) {
        this.scrollHandlers.scrollNewer()
        return
      }

      if (
        type === OsEventTypeList.SYSTEM_EXIT_EVENT ||
        type === OsEventTypeList.ABNORMAL_EXIT_EVENT
      ) {
        this.pageReady = false
        this.overlayLayoutOpen = false
      }
    }

    return this.bridge.onEvenHubEvent(event => {
      if (event.listEvent) {
        handleListEvent(event)
        return
      }
      handleType(resolveEventType(event))
    })
  }
}
