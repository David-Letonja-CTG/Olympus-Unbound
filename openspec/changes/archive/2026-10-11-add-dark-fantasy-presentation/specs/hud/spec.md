# Spec Delta

## ADDED Requirements

### Requirement: Themed, legible HUD
The HUD SHALL use the game's dark ornate visual language (carved stone, dark iron, gold) while keeping every piece of information required by the run HUD. Text and bars SHALL keep a contrast ratio of at least 4.5:1 against their own backgrounds, and the HUD SHALL stay out of the centre of the screen.

#### Scenario: Health vessel
- **WHEN** the player has 60 of 120 health
- **THEN** the health vessel is half full and shows 60 / 120

#### Scenario: Ability slot
- **WHEN** the ability has 10 of 25 seconds of cooldown left
- **THEN** the ability slot shows a darkened sweep covering 40% and the remaining seconds

### Requirement: Boss banner
While a boss is alive, its name, title and health SHALL be shown in an ornate banner at the top of the screen.

#### Scenario: Banner on arrival
- **WHEN** the `cyclops` arrives
- **THEN** the banner shows "The Cyclops", its title and a full health bar
