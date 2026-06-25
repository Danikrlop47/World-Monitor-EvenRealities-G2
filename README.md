# World Monitor · Even Realities G2

A situational awareness app for **Even Realities G2** glasses, inspired by [world-monitor.com](https://world-monitor.com/).

## Layout on glasses

| Left (148px) | Right (428px) |
|---|---|
| Scrollable event feed | Live world map with colored markers |
| Tap to open full article | Selected event highlighted |

**Detail view:** tap an event to open a full-width reader window. Scroll to read more; tap or scroll up at top to return.

## Quick start

```bash
npm install
npm run demo      # Vite dev server + G2 simulator
npm run build     # Production build
npm run pack      # Create .ehpk for Even Hub
```

Open the companion UI in your browser at `http://localhost:5173`. The simulator shows the glasses HUD.

## Controls

| Action | Glasses |
|---|---|
| Scroll down | Next (older) event |
| Scroll up | Previous (newer) event |
| Tap | Open module / open article |
| Hold tap (~1.5s) | Back one screen (detail → module → home) |
| Double-click | Exit app |

On the phone companion UI, tap any event in **The Wire** list to open a detail window with the full text.

## Project structure

```
src/
├── main.ts           # App entry
├── glasses-hud.ts    # G2 display (map + feed + detail)
├── companion-ui.ts   # Phone preview UI
├── events/           # Demo feed + state
├── map/              # World map rendering
└── layout/           # G2 display dimensions
```

## Demo data

Ships with 7 sample global events (conflicts, earthquakes, protests, markets, outbreaks). Live GDELT / news API integration can be added via `events/events-state.ts`.

## Based on

- [Music-controller-for-Amazon-music-on-android-](../Music-controller-for-Amazon-music-on-android-/) — Even Hub SDK patterns
- [EvenRealities-AirAlerts-Ukraine](../EvenRealities-AirAlerts-Ukraine/) — map tiles + scrollable info panel
