## MODIFIED Requirements

### Requirement: Installing the game

The game SHALL be installable as an app. It SHALL have a manifest with its name, its own icons (including a maskable icon and an Apple touch icon), the game's dark colours, full-screen display and landscape orientation. The manifest's start page and scope SHALL be relative, so the game installs wherever it is hosted (its own address, the root of another host, or a sub-path).

#### Scenario: Manifest

- **WHEN** the game's page is loaded
- **THEN** it links a manifest naming "Olympus Unbound", with icons of 192 and 512 pixels, a maskable icon, full-screen display and a relative start page

#### Scenario: Installed under a sub-path

- **WHEN** the release zip is hosted under a sub-path, built with that base path, and installed from there
- **THEN** the installed app opens the game at that address
