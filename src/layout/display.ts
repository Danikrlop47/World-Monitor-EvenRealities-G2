/** Even G2 full display */
export const DISPLAY_W = 576
export const DISPLAY_H = 288

/** Single left column — info + overlay stacked here on glasses */
export const INFO_PANEL_W = 148
export const INFO_PANEL_H = DISPLAY_H

/** Right column: world map */
export const MAP_X = INFO_PANEL_W
export const MAP_DISPLAY_W = DISPLAY_W - INFO_PANEL_W
export const MAP_DISPLAY_H = DISPLAY_H
export const MAP_TILE_W = MAP_DISPLAY_W / 2
export const MAP_TILE_H = MAP_DISPLAY_H / 2

/** Pop-forward module window — edge-to-edge over display */
export const POP_WINDOW_X = 0
export const POP_WINDOW_Y = 0
export const POP_WINDOW_W = DISPLAY_W
export const POP_WINDOW_H = DISPLAY_H
export const POP_WINDOW_BORDER = 3
export const POP_WINDOW_RADIUS = 4

/** @deprecated companion-only split layout */
export const MODULE_PANEL_W = 52
export const CONTENT_PANEL_X = MODULE_PANEL_W
export const CONTENT_PANEL_W = 96
export const LEFT_STACK_W = INFO_PANEL_W
