# Tasks

## 1. Touch controls, landscape, fullscreen (PR 1)

- [x] 1.1 `stickVector` and `TouchControls` (DOM layer, multi-touch, taps, sprint toggle), unit tests
- [x] 1.2 `'touch'` control scheme in `InputReader`; the play screen passes it on touch devices; HUD hides key hints
- [x] 1.3 `TouchScreen` service; fullscreen and landscape lock on Begin / Play again / first touch
- [x] 1.4 Play screen: pause button, rotate overlay with pause, gesture blocking; viewport-fit and overscroll rules
- [x] 1.5 Touch-sized level-up and pause dialogs; sound unlock on touchend; Players panel hidden on touch-only
- [x] 1.6 Unit tests for the screen pieces; Playwright `phone` project (move, dash, pause by touch); `npm run check`, `npm run e2e`; playtest

## 2. Phone HUD and menus (PR 2)

- [ ] 2.1 HUD phone-landscape layout clear of the thumbs; minimap, boss banner and announcements sized down
- [ ] 2.2 Every menu screen at 375–430 px portrait and 390–430 px landscape
- [ ] 2.3 Tests, `npm run check`, `npm run e2e`; playtest with screenshots at Low and High

## 3. Performance on phones (PR 3)

- [ ] 3.1 Measurement script under phone emulation (CPU ×4, Low, ~300 enemies); baseline numbers
- [ ] 3.2 Tune presentation where measured; default Low on touch devices; numbers after
- [ ] 3.3 Docs (README, gameplay controls, architecture input and performance), phone scene in docs/images; `npm run check`, `npm run e2e`; playtest
