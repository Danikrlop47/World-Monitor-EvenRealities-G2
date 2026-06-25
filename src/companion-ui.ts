import { mountCompanionGlobe } from './map/companion-globe'
import { subscribeGlobeRotation } from './map/globe-rotation'
import { MODULES } from './modules/definitions'
import type { MonitorState, MonitorSnapshot } from './monitor-state'

export function mountCompanionUi(state: MonitorState, root: HTMLElement): void {
  root.innerHTML = `
    <div class="shell">
      <header>
        <p class="eyebrow">Even G2 · World Monitor</p>
        <h1>World Events</h1>
        <p class="subtitle">Inspired by <a href="https://world-monitor.com/" target="_blank" rel="noopener">world-monitor.com</a> · <span class="demo-badge">Demo feed</span></p>
      </header>

      <div class="monitor-shell" id="monitor-shell">
        <section class="card monitor-stage" id="monitor-stage">
          <aside class="left-stack">
            <nav class="module-panel" id="module-panel" aria-label="Data layers"></nav>
          </aside>
          <div class="map-area">
            <div id="map-host" class="map-host"></div>
          </div>
        </section>

        <div class="layer-overlay module-layer" id="module-overlay" hidden>
          <div class="layer-backdrop" data-close="module"></div>
          <div class="layer-window module-window" role="dialog" aria-modal="true" aria-labelledby="module-overlay-title">
            <header class="layer-header">
              <h2 id="module-overlay-title"></h2>
              <button type="button" class="layer-close" id="module-overlay-close" aria-label="Close module">×</button>
            </header>
            <ul class="module-item-list" id="module-overlay-list"></ul>
          </div>
        </div>

        <div class="layer-overlay detail-layer" id="detail-overlay" hidden>
          <div class="layer-backdrop" data-close="detail"></div>
          <div class="layer-window detail-window" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button type="button" class="layer-close" id="detail-close" aria-label="Close">×</button>
            <p class="detail-category" id="detail-category"></p>
            <h2 class="detail-title" id="detail-title"></h2>
            <p class="detail-meta" id="detail-meta"></p>
            <div class="detail-body" id="detail-body"></div>
          </div>
        </div>
      </div>

      <section class="card hints">
        <h2>Controls</h2>
        <ul>
          <li><strong>Module buttons</strong> → full window pops toward you (map recedes behind)</li>
          <li><strong>Item tap</strong> → detail overlay stacked above</li>
          <li><strong>Backdrop / × / Esc</strong> → close top overlay</li>
          <li><strong>Glasses scroll</strong> → move list selection (WIRE, CHAT…)</li>
          <li><strong>Glasses tap</strong> → open module · tap item for full text · tap <strong>← BACK</strong> to return</li>
          <li><strong>Scroll up</strong> on first item → back to home menu</li>
          <li><strong>Hold tap ~1.5s</strong> → back (detail → module → home)</li>
        </ul>
      </section>
    </div>
  `

  const monitorShell = root.querySelector<HTMLElement>('#monitor-shell')!
  const modulePanel = root.querySelector<HTMLElement>('#module-panel')!
  const mapHost = root.querySelector<HTMLElement>('#map-host')!
  const moduleOverlay = root.querySelector<HTMLElement>('#module-overlay')!
  const moduleOverlayTitle = root.querySelector<HTMLElement>('#module-overlay-title')!
  const moduleOverlayList = root.querySelector<HTMLElement>('#module-overlay-list')!
  const moduleOverlayClose = root.querySelector<HTMLButtonElement>('#module-overlay-close')!
  const moduleWindow = root.querySelector<HTMLElement>('.module-window')!
  const detailOverlay = root.querySelector<HTMLElement>('#detail-overlay')!
  const detailWindow = root.querySelector<HTMLElement>('.detail-window')!
  const detailClose = root.querySelector<HTMLButtonElement>('#detail-close')!
  const detailCategory = root.querySelector<HTMLElement>('#detail-category')!
  const detailTitle = root.querySelector<HTMLElement>('#detail-title')!
  const detailMeta = root.querySelector<HTMLElement>('#detail-meta')!
  const detailBody = root.querySelector<HTMLElement>('#detail-body')!

  for (const mod of MODULES) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'module-btn'
    btn.dataset.module = mod.id
    btn.innerHTML = `<span class="module-num">${mod.num}</span><span class="module-label">${mod.label}</span>`
    btn.addEventListener('click', e => {
      e.stopPropagation()
      state.openModule(mod.id)
    })
    modulePanel.appendChild(btn)
  }

  let latestIndex = 0

  mountCompanionGlobe(
    mapHost,
    () => state.getItems(),
    () => latestIndex,
    subscribeGlobeRotation,
  )

  function renderModuleButtons(snapshot: MonitorSnapshot): void {
    modulePanel.querySelectorAll<HTMLButtonElement>('.module-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.module === snapshot.module)
    })
  }

  function triggerPop(el: HTMLElement, className = 'is-popping'): void {
    el.classList.remove(className)
    void el.offsetWidth
    el.classList.add(className)
    el.addEventListener(
      'animationend',
      () => el.classList.remove(className),
      { once: true },
    )
  }

  let lastOverlay: MonitorSnapshot['overlay'] = 'none'

  function showModuleOverlay(snapshot: MonitorSnapshot, animate: boolean): void {
    moduleOverlayTitle.textContent = snapshot.moduleLabel
    moduleOverlayList.innerHTML = ''

    const backLi = document.createElement('li')
    backLi.className =
      snapshot.feedListIndex === 0 ? 'module-item module-item-back active' : 'module-item module-item-back'
    backLi.innerHTML = `<span class="module-item-title">← Back</span>`
    backLi.addEventListener('click', e => {
      e.stopPropagation()
      state.closeAllOverlays()
    })
    moduleOverlayList.appendChild(backLi)

    for (const [i, item] of state.getItems().entries()) {
      const listIndex = i + 1
      const li = document.createElement('li')
      li.className =
        listIndex === snapshot.feedListIndex ? 'module-item active' : 'module-item'
      li.innerHTML = `
        <span class="module-item-dot" style="background:${item.color}"></span>
        <span class="module-item-time">${item.time}${i === 0 ? ' · latest' : ''}</span>
        <p class="module-item-title">${item.title}</p>
        <p class="module-item-summary">${item.summary}</p>
        <span class="module-item-location">${item.location}</span>
      `
      li.addEventListener('click', e => {
        e.stopPropagation()
        state.openDetailForIndex(i)
      })
      moduleOverlayList.appendChild(li)
    }

    moduleOverlay.hidden = false
    monitorShell.classList.add('module-open')
    if (animate) triggerPop(moduleWindow)
    moduleOverlayList.querySelector('.module-item.active')?.scrollIntoView({ block: 'nearest' })
  }

  function showDetailOverlay(snapshot: MonitorSnapshot, animate: boolean): void {
    const { item, moduleLabel } = snapshot
    detailCategory.textContent = moduleLabel
    detailCategory.style.color = item.color
    detailTitle.textContent = item.title
    detailMeta.textContent = `${item.time} · ${item.location}`
    detailBody.textContent = item.body
    detailOverlay.hidden = false
    monitorShell.classList.add('detail-open')
    if (animate) triggerPop(detailWindow, 'is-popping')
  }

  function render(snapshot: MonitorSnapshot): void {
    const prevOverlay = lastOverlay
    lastOverlay = snapshot.overlay
    latestIndex = snapshot.index

    renderModuleButtons(snapshot)

    if (snapshot.overlay === 'module' || snapshot.overlay === 'detail') {
      showModuleOverlay(snapshot, prevOverlay === 'none')
    } else {
      moduleOverlay.hidden = true
      monitorShell.classList.remove('module-open')
    }

    if (snapshot.overlay === 'detail') {
      showDetailOverlay(snapshot, prevOverlay !== 'detail')
    } else {
      detailOverlay.hidden = true
      monitorShell.classList.remove('detail-open')
    }
  }

  state.subscribe(render)

  moduleOverlayClose.addEventListener('click', () => state.closeAllOverlays())
  moduleOverlay.querySelector('.layer-backdrop')!.addEventListener('click', () => state.closeAllOverlays())

  detailClose.addEventListener('click', () => state.closeOverlay())
  detailOverlay.querySelector('.layer-backdrop')!.addEventListener('click', () => state.closeOverlay())

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    const snapshot = state.getSnapshot()
    if (snapshot.overlay === 'detail') state.closeOverlay()
    else if (snapshot.overlay === 'module') state.closeAllOverlays()
  })
}
