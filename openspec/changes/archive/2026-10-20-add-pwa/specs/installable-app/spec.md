## ADDED Requirements

### Requirement: Installing the game

The game SHALL be installable as an app. It SHALL have a manifest with its name, its own icons (including a maskable icon and an Apple touch icon), the game's dark colours, full-screen display and landscape orientation. The manifest's start page and scope SHALL be relative, so the game installs wherever it is hosted (the root of a host, or a sub-path such as GitHub Pages').

#### Scenario: Manifest

- **WHEN** the game's page is loaded
- **THEN** it links a manifest naming "Olympus Unbound", with icons of 192 and 512 pixels, a maskable icon, full-screen display and a relative start page

#### Scenario: Installed under a sub-path

- **WHEN** the game is installed from https://david-letonja-ctg.github.io/Olympus-Unbound/
- **THEN** the installed app opens the game at that address

### Requirement: Install hint

Where the browser offers installation and the game is not installed, the main menu SHALL show an "Install the game" button that opens the browser's install prompt. On iPhone and iPad Safari, outside the installed app, the main menu SHALL instead explain how to add the game to the Home Screen, and SHALL warn that the installed game keeps its own saves. The hint SHALL NOT be shown in the installed game or during a run. It SHALL be dismissable for the rest of the visit.

#### Scenario: Install from Chrome

- **WHEN** Chrome offers to install the game and the player taps "Install the game" on the main menu
- **THEN** the browser's install prompt opens

#### Scenario: iPhone Safari

- **WHEN** the main menu opens in Safari on an iPhone
- **THEN** it explains Share → Add to Home Screen, and that the installed game keeps its own saves

#### Scenario: Already installed

- **WHEN** the game runs as an installed app
- **THEN** no install hint is shown

### Requirement: Playing offline

In a production build, once the game has been loaded online, a service worker SHALL keep every file of the build. After that, the menus, the intro and solo runs (all realms, art, sounds and fonts) SHALL start and play without a network, including when the game is opened from a deep link. Saves stay in the browser's storage as before (D8).

#### Scenario: A run offline

- **WHEN** the game has been loaded once, the device goes offline, and the player opens the game and starts a solo run
- **THEN** the run loads and plays

#### Scenario: Development builds

- **WHEN** the game runs from the development server
- **THEN** no service worker is registered

### Requirement: Rooms need a connection

While the device is offline, the Co-op screen SHALL say that rooms need an internet connection, and SHALL disable creating and joining a room. Once the connection returns, it SHALL enable them again.

#### Scenario: Offline co-op screen

- **WHEN** the player opens Co-op while offline
- **THEN** a message says rooms need a connection, and Create and Join are disabled

### Requirement: Updates

When a newer version of the game has been published, the installed or cached game SHALL download it in the background. The main menu SHALL then offer "A new version is ready · Reload", which reloads into the new version. The game SHALL NOT reload by itself. If the cached version can no longer be served, the main menu SHALL ask the player to reload.

#### Scenario: A new release

- **WHEN** a new version finishes downloading while the player is in a run
- **THEN** the run goes on, and the main menu offers to reload into the new version afterwards

### Requirement: Full screen when installed

When the game runs as an installed app in full-screen or standalone display, starting a run SHALL NOT ask the browser for fullscreen again.

#### Scenario: Installed on a phone

- **WHEN** the installed game starts a run on a phone
- **THEN** the game fills the screen and no fullscreen request is made
