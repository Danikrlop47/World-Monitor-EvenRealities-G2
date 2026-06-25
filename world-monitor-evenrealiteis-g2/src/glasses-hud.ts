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
import { formatDetailOverlay, isFeedBackListEvent, moduleFeedItemNames, moduleListItemNames } from './modules/format-glasses'
import { mapItemsKey, renderMapTiles, tilesEqual } from './map/render-map'
import { getGlobeRotationY, subscribeGlobeRotation } from './map/globe-rotation'
import { GlassesHoldGesture } from './glasses-hold'
import type { ModuleItem } from './modules/demo-data'

const LIST_CONTAINER_ID = 6
const INFO_CONTAINER_ID = 6
const MAP_TILE_IDS = [2, 3, 4, 5] as const
const MAP_TILE_NAMES = ['tile-tl', 'tile-tr', 'tile-bl', 'tile-br'] as const

export interface MonitorScrollHandlers {
  scrollOlder: () => void
  scrollNewer: () => void
  glassesTap: () => void
  glassesTapFeedRow: (listIndex: number) => void
  glassesGoBack: () => void
  setPickerIndex: (index: number) => void
  setFeedIndex: (index: number) => void
  openSelectedModule: () => void
  isHomeMenu: () => boolean
  isModuleFeed: () => boolean
  getFeedItems: () => ModuleItem[]
  getFeedIndex: () => number
}

function normalizeEventType(raw: unknown): OsEventTypeList | undefined {
  if (raw === undefined || raw === null) return undefined
  if (raw === 9 || raw === '9' || raw === 'LONG_PRESS_EVENT' || raw === 'LONG_PRESS') {
    return undefined
  }
  return OsEventTypeList.fromJson(raw)
}

function isLongPressEvent(event: EvenHubEvent): boolean {
  const rawTypes = [
    event.listEvent?.eventType,
    event.textEvent?.eventType,
    event.sysEvent?.eventType,
    (event.jsonData as { eventType?: unknown } | undefined)?.eventType,
  ]
  return rawTypes.some(
    raw => raw === 9 || raw === '9' || raw === 'LONG_PRESS_EVENT' || raw === 'LONG_PRESS',
  )
}

function resolveFeedIndex(listEvent: List_ItemEvent, items: ModuleItem[]): number | undefined {
  const names = moduleFeedItemNames(items)
  const name = listEvent.currentSelectItemName
  if (name) {
    const byName = names.findIndex(n => n === name)
    if (byName >= 0) return byName
  }

  if (
    listEvent.currentSelectItemIndex !== undefined &&
    listEvent.currentSelectItemIndex !== null
  ) {
    return listEvent.currentSelectItemIndex
  }

  return undefined
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
  return resolveScrollType(event)
}

function resolveScrollType(event: EvenHubEvent): OsEventTypeList | undefined {
  const fromList = normalizeEventType(event.listEvent?.eventType)
  if (fromList !== undefined) return fromList

  const fromText = normalizeEventType(event.textEvent?.eventType)
  if (fromText !== undefined) return fromText

  const fromSys = normalizeEventType(event.sysEvent?.eventType)
  if (fromSys !== undefined) return fromSys

  const json = event.jsonData as { eventType?: unknown; eventSource?: unknown } | undefined
  return normalizeEventType(json?.eventType)
}

/** Touch-down before click release (simulator Click hold, glasses touchpad). */
function isPressStart(event: EvenHubEvent): boolean {
  if (
    event.sysEvent?.eventSource != null &&
    event.sysEvent.eventType == null &&
    !event.sysEvent.imuData
  ) {
    return true
  }

  const json = event.jsonData as { eventType?: unknown; eventSource?: unknown } | undefined
  if (
    json?.eventSource != null &&
    json.eventType == null &&
    !event.textEvent &&
    !event.listEvent
  ) {
    return true
  }

  return false
}

function isClickEvent(type: OsEventTypeList | undefined): boolean {
  return type === OsEventTypeList.CLICK_EVENT || type === undefined
}

function inferFeedListIndex(
  prevIndex: number,
  type: OsEventTypeList,
  rowCount: number,
): number {
  if (rowCount <= 0) return 0
  if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    return Math.min(rowCount - 1, prevIndex + 1)
  }
  if (type === OsEventTypeList.SCROLL_TOP_EVENT) {
    return Math.max(0, prevIndex - 1)
  }
  return prevIndex
}

export class GlassesHud {
  private pageReady = false
  private overlayMode: MonitorSnapshot['overlay'] = 'none'
  private lastFeedKey = ''
  private mapFlushPromise: Promise<void> | null = null
  private pendingMapKey: string | null = null
  private pendingMapItems: ModuleItem[] = []
  private pendingMapIndex = 0
  private forceNextMapFlush = false
  private uiQueue: Promise<void> = Promise.resolve()
  private lastMapKey = ''
  private lastPanelKey = ''
  private lastMapTiles: (Uint8Array | null)[] = [null, null, null, null]
  private mapItems: ModuleItem[] = []
  private mapIndex = 0
  private mapOverlay: MonitorSnapshot['overlay'] = 'none'
  private pendingRotY: number | null = null
  private lastGlobeUploadAt = 0
  private globeUnsub: (() => void) | null = null
  /** Native feed list selection — kept in sync from list events (monitor index can lag). */
  private nativeFeedIndex = 0

  private static readonly GLOBE_UPLOAD_MS = 350

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

  /** Native module feed list — same separated rows as the home menu. */
  private moduleFeedList(items: ModuleItem[]) {
    const names = moduleFeedItemNames(items)
    return new ListContainerProperty({
      xPosition: POP_WINDOW_X,
      yPosition: POP_WINDOW_Y,
      width: POP_WINDOW_W,
      height: POP_WINDOW_H,
      borderWidth: 1,
      borderColor: 5,
      borderRadius: POP_WINDOW_RADIUS,
      paddingLength: 4,
      containerID: LIST_CONTAINER_ID,
      containerName: 'feed-menu',
      itemContainer: new ListItemContainerProperty({
        itemCount: names.length,
        itemWidth: 0,
        isItemSelectBorderEn: 1,
        itemName: names,
      }),
      isEventCapture: 1,
    })
  }

  /** Full-screen detail text. */
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
    this.overlayMode = 'none'
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
    this.overlayMode = 'none'
    this.lastPanelKey = ''
    this.lastMapKey = ''
    this.lastMapTiles = [null, null, null, null]
    console.log('[hud] page rebuilt:', ok ? 'ok' : 'failed')
  }

  private async rebuildForOverlayMode(
    mode: MonitorSnapshot['overlay'],
    items: ModuleItem[],
  ): Promise<void> {
    if (mode === 'none') {
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
    } else if (mode === 'module') {
      this.nativeFeedIndex = 0
      const ok = await this.bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 1,
          listObject: [this.moduleFeedList(items)],
        }),
      )
      if (!ok) console.warn('[hud] feed list rebuild failed')
    } else {
      const ok = await this.bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 1,
          textObject: [this.popPanel()],
        }),
      )
      if (!ok) console.warn('[hud] detail rebuild failed')
    }

    this.overlayMode = mode
    this.lastPanelKey = ''
  }

  async ensurePage(): Promise<void> {
    await this.init()
    if (!this.pageReady) await this.rebuild()
  }

  sync(snapshot: MonitorSnapshot, items: ModuleItem[]): Promise<void> {
    this.mapItems = items
    this.mapIndex = snapshot.index
    this.mapOverlay = snapshot.overlay
    if (snapshot.overlay === 'module') {
      this.nativeFeedIndex = snapshot.feedListIndex
    }

    this.uiQueue = this.uiQueue.then(async () => {
      if (!this.pageReady) return
      await this.renderPanel(snapshot)
      if (snapshot.overlay === 'none') {
        await this.renderMapInner(snapshot, items)
      }
    })
    return this.uiQueue
  }

  /** Throttled globe rotation frames for glasses map tiles (home menu only). */
  bindGlobeRotation(): () => void {
    if (this.globeUnsub) return this.globeUnsub

    this.globeUnsub = subscribeGlobeRotation(rotY => {
      if (!this.pageReady || this.mapOverlay !== 'none') return

      const now = performance.now()
      if (now - this.lastGlobeUploadAt < GlassesHud.GLOBE_UPLOAD_MS) return

      this.pendingRotY = rotY
      void this.scheduleMapFlush()
    })

    return () => {
      this.globeUnsub?.()
      this.globeUnsub = null
    }
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
        if (this.pendingMapKey || this.pendingRotY !== null) void this.scheduleMapFlush()
      })
    }
    return this.mapFlushPromise
  }

  private async flushPendingMap(): Promise<void> {
    while (this.pendingMapKey || (this.pendingRotY !== null && this.mapOverlay === 'none')) {
      if (this.pendingMapKey) {
        const mapKey = this.pendingMapKey
        const items = this.pendingMapItems
        const index = this.pendingMapIndex
        this.pendingMapKey = null
        const forceAllTiles = this.forceNextMapFlush
        this.forceNextMapFlush = false

        if (!forceAllTiles && mapKey === this.lastMapKey) continue

        try {
          const tiles = await renderMapTiles(items, index, getGlobeRotationY())
          await this.uploadMapTilesSequential(tiles, forceAllTiles)
          this.lastMapKey = mapKey
        } catch (err) {
          console.warn('[hud] map render failed:', err)
        }
        continue
      }

      if (this.pendingRotY === null || this.mapOverlay !== 'none') continue

      const rotY = this.pendingRotY
      this.pendingRotY = null
      this.lastGlobeUploadAt = performance.now()

      try {
        const tiles = await renderMapTiles(this.mapItems, this.mapIndex, rotY)
        await this.uploadMapTilesSequential(tiles, false)
      } catch (err) {
        console.warn('[hud] globe frame failed:', err)
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
    const popText = formatDetailOverlay(snapshot)

    const ok = await this.bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: INFO_CONTAINER_ID,
        containerName: 'info-feed',
        contentOffset: snapshot.detailScrollOffset,
        contentLength: popText.length,
        content: popText,
      }),
    )
    if (!ok) console.warn('[hud] pop layer upgrade failed')
  }

  private async renderPanel(snapshot: MonitorSnapshot): Promise<void> {
    const mode = snapshot.overlay
    const feedKey =
      mode === 'module'
        ? `${snapshot.module}|${this.mapItems.map(item => item.id).join(',')}`
        : ''

    const modeChanged = mode !== this.overlayMode
    const feedChanged = mode === 'module' && feedKey !== this.lastFeedKey

    if (modeChanged || feedChanged) {
      await this.rebuildForOverlayMode(mode, this.mapItems)
      if (mode === 'module') this.lastFeedKey = feedKey
    }

    if (mode !== 'detail') return

    const panelKey = [
      snapshot.module,
      snapshot.index,
      snapshot.detailScrollOffset,
    ].join('|')

    if (panelKey === this.lastPanelKey) return
    this.lastPanelKey = panelKey

    await this.upgradePopContainer(snapshot)
  }

  /** Module feed: track native list selection (row 0 = Back). */
  private handleModuleFeedScroll(
    event: EvenHubEvent,
    listEvent: List_ItemEvent | undefined,
    hold: GlassesHoldGesture,
  ): boolean {
    if (!this.scrollHandlers.isModuleFeed()) return false

    const items = this.scrollHandlers.getFeedItems()
    const rowCount = moduleFeedItemNames(items).length
    const prevIndex = this.nativeFeedIndex
    const scrollType = resolveScrollType(event)
    const listType = listEvent ? normalizeEventType(listEvent.eventType) : undefined
    const type = listType ?? scrollType

    let nextIndex = listEvent ? resolveFeedIndex(listEvent, items) : undefined
    if (
      nextIndex === undefined &&
      (type === OsEventTypeList.SCROLL_TOP_EVENT ||
        type === OsEventTypeList.SCROLL_BOTTOM_EVENT)
    ) {
      nextIndex = inferFeedListIndex(prevIndex, type, rowCount)
    }

    if (
      type === OsEventTypeList.SCROLL_TOP_EVENT ||
      type === OsEventTypeList.SCROLL_BOTTOM_EVENT
    ) {
      if (nextIndex !== undefined) {
        this.nativeFeedIndex = nextIndex
        this.scrollHandlers.setFeedIndex(nextIndex)
      }
      return true
    }

    if (listEvent) {
      if (nextIndex !== undefined) {
        this.nativeFeedIndex = nextIndex
        this.scrollHandlers.setFeedIndex(nextIndex)
      }

      if (isClickEvent(listType)) {
        if (isFeedBackListEvent(listEvent)) {
          this.nativeFeedIndex = 0
          this.scrollHandlers.setFeedIndex(0)
          hold.onPressEnd(() => this.scrollHandlers.glassesGoBack())
          return true
        }

        const tapIndex = nextIndex ?? this.nativeFeedIndex
        this.nativeFeedIndex = tapIndex
        this.scrollHandlers.setFeedIndex(tapIndex)
        hold.onPressEnd(() => this.scrollHandlers.glassesTapFeedRow(tapIndex))
      }
      return true
    }

    return false
  }

  bindEvents(): () => void {
    let lastEventAt = 0
    const DEBOUNCE_MS = 250
    const hold = new GlassesHoldGesture()

    const canGoBack = (): boolean =>
      !this.scrollHandlers.isHomeMenu()

    const onHold = (): void => {
      if (!canGoBack()) return
      this.scrollHandlers.glassesGoBack()
    }

    const onTap = (): void => {
      if (this.scrollHandlers.isHomeMenu()) {
        this.scrollHandlers.openSelectedModule()
        return
      }
      if (this.scrollHandlers.isModuleFeed()) {
        this.scrollHandlers.glassesTap()
        return
      }
      this.scrollHandlers.glassesTap()
    }

    const handleListEvent = (event: EvenHubEvent): void => {
      if (!event.listEvent) return

      const listEvent = event.listEvent
      const type = normalizeEventType(listEvent.eventType)

      if (this.scrollHandlers.isHomeMenu()) {
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

        if (isClickEvent(type)) {
          hold.onPressEnd(onTap)
        }
      }
    }

    const handleType = (type: OsEventTypeList | undefined): void => {
      if (type == null) return

      const now = Date.now()
      if (now - lastEventAt < DEBOUNCE_MS) return
      lastEventAt = now

      if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
        hold.cancel()
        void this.bridge.shutDownPageContainer(1)
        return
      }

      if (this.scrollHandlers.isHomeMenu()) return

      if (this.scrollHandlers.isModuleFeed()) return

      if (type === OsEventTypeList.CLICK_EVENT) {
        hold.onPressEnd(onTap)
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
        hold.cancel()
        this.pageReady = false
        this.overlayMode = 'none'
      }
    }

    return this.bridge.onEvenHubEvent(event => {
      if (isLongPressEvent(event)) {
        hold.cancel()
        onHold()
        return
      }

      if (this.handleModuleFeedScroll(event, event.listEvent, hold)) {
        return
      }

      if (isPressStart(event)) {
        if (canGoBack()) hold.onPressStart(onHold)
        return
      }

      if (event.listEvent) {
        handleListEvent(event)
        return
      }
      handleType(resolveEventType(event))
    })
  }
}
