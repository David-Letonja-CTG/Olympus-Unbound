# Proposal

## Why

The owner reported (2026-10-23) that level-ups run out: past a certain level every weapon, armour, relic and skill is at its top. Each further level then offers only a heal or some gold, so a long endless run stops growing. They asked for:

- upgrades that stay worth taking until the end;
- a skill tree of combined upgrades, unlocked by having particular upgrades at particular levels;
- a way to see during play what the build holds and what it still needs ("AHA, we need this and this to unlock that").

## What Changes

- **Fusions:** combined upgrades defined in data. Each fusion names requirements: weapons, armour or skills at given levels, relics, or other fusions. Once all are met, the fusion joins the level-up offers. Fusions have levels, stack their bonuses per level, and come in three tiers:
  - Tier I fuses two upgrades at their top level, for example the Flaming Sword and the War Hammer at level 6 → *Forge of Hephaestus*.
  - Tier II fuses two tier I fusions at their top level.
  - Tier III, *Apotheosis*, crowns the three tier II fusions.

  Synergies stay as they are: they activate on their own.
- **Ascensions:** upgrades without a top level (+5% damage, +15 health, faster attacks, more gold and XP). They fill the offers whenever fewer than three other upgrades are left. So every level-up until the end of a run offers three real choices.
- **The build panel:** an overlay the player opens during play with Tab (or a gamepad's Back/Select, or a button on a phone). Play goes on while it is open. It shows:
  - the whole build: weapons, armour, relics, skills, fusions and ascensions, with levels;
  - the tree of every fusion and synergy this god can reach, each requirement ticked or showing the level still needed, and which fusions are ready to be offered.

  It can also be opened over a level-up choice.
- **Hints at level-up:** an offer that counts toward a fusion or synergy says which.

The playable outcome: a player in the third realm opens the panel and sees that *Forge of Hephaestus* needs the War Hammer at level 6, takes the hammer's next level, and two level-ups later is offered the fusion. At level 90 they still choose between three real upgrades.

## Capabilities

### Modified Capabilities

- `run-progression`: fusions, ascensions, and what is offered when nothing else is left.
- `hud`: the build panel.

## Non-goals

- New weapon behaviors for fusions. Fusions grant stat modifiers, like synergies, so a new fusion is data only (D4).
- Saving builds between runs or a meta skill tree. Permanent upgrades stay as they are.
- Changing existing synergies or making them choosable.
