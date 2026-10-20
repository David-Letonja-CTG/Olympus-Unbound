# phone-play Specification

## Purpose
Defines how the game is played on a phone or tablet: touch controls, the phone screen (landscape, fullscreen, gestures, safe areas), co-op on a touch device, the phone HUD and menus, and performance on phones.

## Requirements

### Requirement: Touch controls

On a device whose main pointer is touch, a run SHALL show touch controls over the arena. A thumb touching down on the left half of the screen SHALL place a stick under it. Dragging the thumb SHALL move the god in the drag's direction, at a speed that grows with the drag's distance up to full speed at the stick's rim. A drag shorter than the dead zone SHALL be ignored. Dragging past the rim SHALL pull the stick along behind the thumb. Lifting the thumb SHALL stop the god and hide the stick. Buttons on the right SHALL fire the ability and dash, with a short tap counting like a quick key press. A third button SHALL switch sprint on and off, and SHALL show whether sprint is on. Each finger SHALL drive only the control it first touched, so the stick and a button work at the same time. On a device whose main pointer is not touch, touch controls SHALL NOT be shown. A keyboard or gamepad connected to a touch device SHALL keep working alongside them.

#### Scenario: Stick appears under the thumb

- **WHEN** the player touches the left half of the screen during a run
- **THEN** the stick's base appears centred where the thumb landed

#### Scenario: Moving by touch

- **WHEN** the player drags the stick fully to the right and holds it
- **THEN** the god moves right at walking speed

#### Scenario: Half a drag

- **WHEN** the stick is dragged half of the way to its rim
- **THEN** the god moves at half of its walking speed

#### Scenario: Dead zone by touch

- **WHEN** the thumb moves less than the dead zone from where it landed
- **THEN** the god does not move

#### Scenario: Lifting the thumb

- **WHEN** the player lifts the thumb from the stick
- **THEN** the god stops and the stick disappears

#### Scenario: Dashing by touch

- **WHEN** the player moves with the stick and taps the dash button
- **THEN** the god dashes in the direction of movement

#### Scenario: Ability by touch

- **WHEN** the player taps the ability button while the ability is ready
- **THEN** the ability fires

#### Scenario: Sprint toggle

- **WHEN** the player taps the sprint button and moves with the stick
- **THEN** the god sprints, the button shows sprint is on, and a second tap turns sprint off

#### Scenario: Two thumbs

- **WHEN** the player holds the stick with one thumb and taps the dash button with the other
- **THEN** the god keeps moving and dashes

#### Scenario: Desktop

- **WHEN** the game runs on a computer with a mouse
- **THEN** no touch controls are shown and the keyboard and gamepads work as before

### Requirement: Touch menus during a run

On a touch device the run SHALL show an on-screen pause button that opens the pause menu (in a room, the room's menu, while the fight goes on). On touch devices the level-up, treasure, shop and pause dialogs SHALL have targets at least 44 CSS pixels tall. These dialogs SHALL fit a phone held in landscape without scrolling the page.

#### Scenario: Pausing by touch

- **WHEN** the player taps the pause button during a solo run
- **THEN** the run pauses and the pause menu opens

#### Scenario: Choosing by touch

- **WHEN** a level-up choice opens on a phone in landscape
- **THEN** every offer can be tapped without scrolling the page, and tapping one chooses it

### Requirement: The phone screen

On a touch device a run SHALL be played in landscape. While the phone is held upright during a run, an overlay SHALL ask the player to turn it, and a solo run SHALL pause. Starting a run SHALL ask for fullscreen and landscape where the browser allows it; a browser that refuses SHALL still start the run. During a run the page SHALL NOT zoom, scroll, pull to refresh, select text or open the long-press menu in response to touches. Touch controls and the HUD SHALL stay inside the screen's safe area (clear of a notch or rounded corners). The game's sound SHALL start on the first touch.

#### Scenario: Holding the phone upright

- **WHEN** the player turns the phone to portrait during a solo run
- **THEN** a "turn your phone" overlay covers the run and the run is paused

#### Scenario: Turning back

- **WHEN** the player turns the phone back to landscape
- **THEN** the overlay disappears and the pause menu is shown, ready to resume

#### Scenario: Fullscreen refused

- **WHEN** the browser does not allow fullscreen
- **THEN** the run starts in the browser window as usual

#### Scenario: Pinching during a run

- **WHEN** the player pinches or double-taps the arena
- **THEN** the page does not zoom

### Requirement: Co-op on a phone

On a device with only touch input, local co-op on one screen SHALL NOT be offered (the god selection shows no Players panel). Online rooms SHALL work by touch: creating, joining, readying and playing.

#### Scenario: No shared screen on a phone

- **WHEN** a player opens god selection on a phone
- **THEN** the Players panel is not shown, and bot allies can still be added

#### Scenario: A room on a phone

- **WHEN** a phone player joins a room by code and the host starts the run
- **THEN** the phone player plays their god with the touch controls

### Requirement: Phone HUD

On a phone held in landscape (a screen about 390–430 CSS pixels tall), the run HUD SHALL keep its ornate look (frieze, orbs on tripods, plaques, medallions) and every piece of information, scaled to the height. It SHALL leave the stick's area and the buttons' area free. The minimap, the boss banner and announcements SHALL shrink so that the centre of the screen stays clear.

#### Scenario: HUD on a phone

- **WHEN** a solo run is played on a phone 390 CSS pixels tall in landscape
- **THEN** the orbs, ability, loadout, experience, timer, gold and kills are visible, none of them overlaps the touch controls, and none covers the god

### Requirement: Phone menus

Every menu screen SHALL be usable on a phone: at 375–430 CSS pixels wide in portrait, and at 390–430 CSS pixels tall in landscape. Content SHALL scroll inside the screen where it does not fit, its main actions SHALL stay reachable, and no screen SHALL scroll sideways.

#### Scenario: God selection on a phone

- **WHEN** a player opens god selection on a phone in portrait
- **THEN** the gods, the selected god's details and the continue action are reachable, and the page does not scroll sideways

#### Scenario: Menus in landscape

- **WHEN** a player opens the main menu, settings, progression or the Hall of Glory on a phone in landscape
- **THEN** every control can be reached and nothing is cut off

### Requirement: Phone performance

On a phone at Low quality, a run with a full horde SHALL stay playable: under phone emulation with a slowed CPU it SHALL keep a median frame time of at most two display frames at 60 Hz (about 33 ms, 30 frames a second) while the simulation keeps real time. Tuning for phones SHALL change only presentation (lights, fog, particles, rendering resolution), never gameplay rules, caps or randomness.

#### Scenario: A full horde on a phone

- **WHEN** a run with about 300 enemies is measured at Low under phone emulation with the CPU slowed four times
- **THEN** the median frame time is at most two 60 Hz frames (about 33 ms) and the simulation keeps real time

#### Scenario: Same rules on every device

- **WHEN** the same seed is played with the same inputs on a phone and on a computer
- **THEN** the simulation produces the same run
