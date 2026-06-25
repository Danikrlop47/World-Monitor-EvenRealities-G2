import { MODULES, moduleById, type MonitorModule } from './modules/definitions'
import { itemsForModule, type ModuleItem } from './modules/demo-data'
import { feedListIndexToItemIndex, formatDetailOverlay, isFeedBackRow } from './modules/format-glasses'

export type OverlayMode = 'none' | 'module' | 'detail'

export interface MonitorSnapshot {
  module: MonitorModule
  moduleLabel: string
  moduleNum: number
  /** Highlighted row in the home module picker (glasses HUD). */
  pickerIndex: number
  /** Highlighted row in the module feed list (0 = Back). */
  feedListIndex: number
  item: ModuleItem
  index: number
  total: number
  overlay: OverlayMode
  detailScrollOffset: number
}

type Listener = (snapshot: MonitorSnapshot) => void

const DETAIL_SCROLL_STEP = 120

export class MonitorState {
  private module: MonitorModule = 'wire'
  private pickerIndex = 0
  private feedListIndex = 0
  private index = 0
  private overlay: OverlayMode = 'none'
  private detailScrollOffset = 0
  private listeners = new Set<Listener>()

  getSnapshot(): MonitorSnapshot {
    const items = itemsForModule(this.module)
    const def = moduleById(this.module)
    return {
      module: this.module,
      moduleLabel: def.label,
      moduleNum: def.num,
      pickerIndex: this.pickerIndex,
      feedListIndex: this.feedListIndex,
      item: items[this.index],
      index: this.index,
      total: items.length,
      overlay: this.overlay,
      detailScrollOffset: this.detailScrollOffset,
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  getItems(): ModuleItem[] {
    return itemsForModule(this.module)
  }

  getAllModules() {
    return MODULES
  }

  /** Sync glasses home list selection (native menu scroll). */
  setPickerIndex(index: number): void {
    if (this.overlay !== 'none') return
    if (index < 0 || index >= MODULES.length) return
    if (index === this.pickerIndex) return
    this.pickerIndex = index
    this.notify()
  }

  /** Sync glasses module feed list selection (0 = Back, 1+ = feed item). */
  setFeedIndex(listIndex: number): void {
    if (this.overlay !== 'module') return
    const items = itemsForModule(this.module)
    if (listIndex < 0 || listIndex > items.length) return
    if (listIndex === this.feedListIndex) return
    this.feedListIndex = listIndex
    if (!isFeedBackRow(listIndex)) {
      this.index = feedListIndexToItemIndex(listIndex)
    }
    this.notify()
  }

  /** Open the highlighted module from the home list (tap). */
  openSelectedModule(): void {
    if (this.overlay !== 'none') return
    const picked = MODULES[this.pickerIndex]
    this.module = picked.id
    this.index = 0
    this.feedListIndex = 0
    this.overlay = 'module'
    this.detailScrollOffset = 0
    this.notify()
  }

  /** Companion UI — pick module and open its overlay window. */
  openModule(module: MonitorModule): void {
    const pick = MODULES.findIndex(m => m.id === module)
    if (pick >= 0) this.pickerIndex = pick
    this.module = module
    this.index = 0
    this.feedListIndex = 0
    this.overlay = 'module'
    this.detailScrollOffset = 0
    this.notify()
  }

  selectIndex(index: number): void {
    const items = itemsForModule(this.module)
    if (index < 0 || index >= items.length) return
    this.index = index
    this.feedListIndex = index + 1
    this.overlay = 'detail'
    this.detailScrollOffset = 0
    this.notify()
  }

  openDetailForIndex(index: number): void {
    this.selectIndex(index)
  }

  closeOverlay(): void {
    if (this.overlay === 'detail') {
      this.overlay = 'module'
      this.detailScrollOffset = 0
    } else {
      this.overlay = 'none'
      this.detailScrollOffset = 0
    }
    this.notify()
  }

  closeAllOverlays(): void {
    this.overlay = 'none'
    this.detailScrollOffset = 0
    this.notify()
  }

  /** Glasses tap on a feed list row (0 = Back, 1+ = open article). */
  glassesTapFeedRow(listIndex: number): void {
    if (this.overlay !== 'module') return

    this.feedListIndex = listIndex
    if (isFeedBackRow(listIndex)) {
      this.glassesGoBack()
      return
    }

    const items = itemsForModule(this.module)
    if (listIndex < 1 || listIndex > items.length) return
    this.index = feedListIndexToItemIndex(listIndex)
    this.overlay = 'detail'
    this.detailScrollOffset = 0
    this.notify()
  }

  /** Glasses tap — open module or article (forward only). */
  glassesTap(): void {
    if (this.overlay === 'none') {
      this.openSelectedModule()
    } else if (this.overlay === 'module') {
      this.glassesTapFeedRow(this.feedListIndex)
    }
  }

  /** Glasses hold — step back one screen (detail → module → home). */
  glassesGoBack(): void {
    if (this.overlay === 'detail') {
      this.overlay = 'module'
      this.feedListIndex = this.index + 1
      this.detailScrollOffset = 0
      this.notify()
      return
    }

    if (this.overlay === 'module') {
      const pick = MODULES.findIndex(m => m.id === this.module)
      if (pick >= 0) this.pickerIndex = pick
      this.overlay = 'none'
      this.feedListIndex = 0
      this.detailScrollOffset = 0
      this.notify()
    }
  }

  scrollOlder(): void {
    if (this.overlay === 'detail') {
      this.scrollDetailDown()
      return
    }

    if (this.overlay === 'module') {
      // Native feed list handles scrolling on glasses.
      return
    }

    // Home — native list container handles scrolling on glasses.
  }

  scrollNewer(): void {
    if (this.overlay === 'detail') {
      this.scrollDetailUp()
      return
    }

    if (this.overlay === 'module') {
      return
    }

    // Home — native list container handles scrolling on glasses.
  }

  private scrollDetailDown(): void {
    const snapshot = this.getSnapshot()
    const fullLen = formatDetailOverlay(snapshot).length
    const maxOffset = Math.max(0, fullLen - 200)
    if (this.detailScrollOffset >= maxOffset) return
    this.detailScrollOffset = Math.min(maxOffset, this.detailScrollOffset + DETAIL_SCROLL_STEP)
    this.notify()
  }

  private scrollDetailUp(): void {
    if (this.detailScrollOffset <= 0) {
      this.overlay = 'module'
      this.feedListIndex = this.index + 1
      this.detailScrollOffset = 0
      this.notify()
      return
    }
    this.detailScrollOffset = Math.max(0, this.detailScrollOffset - DETAIL_SCROLL_STEP)
    this.notify()
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}

export type { ModuleItem }
