# Proposal

## Why

The owner reported two problems in play (2026-10-21):

- In the Labyrinth, monsters get stuck against walls. Every enemy walks in a straight line at the nearest god, so a wall between them leaves it pressed against the wall, shaking. The maze, meant to be dangerous, empties out, and the horde the realm is built around never arrives.
- Asterion raises his shifting walls in rings around himself, and the gaps in the rings are offset on purpose. Walking straight, he cannot find the way out of his own cage. Worse, at his size the inner rings' gaps (27–83 px) are narrower than he is (100 px). He stands caged while the gods hit him from outside, so the fight is too easy.

## What Changes

- **Monsters find their way.** Enemies and bosses walk around obstacles and walls toward the nearest god by path. They go straight when they can see the god, and through the maze's corridors and breaches when they cannot.
- **Chargers charge only at what they see.** A charger such as `minotaur` no longer winds up and dashes into a wall at a god on the other side of it.
- **Asterion can leave his walls.** Every gap in a ring of shifting walls is wide enough for the boss that raised it. Where his rings stand too close together for him to walk between them, their gaps line up. He walks out through the gaps, and his bull rush can still run into a wall and daze him.

## Capabilities

### Modified Capabilities

- `enemy-spawning`: finding the way around obstacles; chargers need sight.
- `boss-encounter`: bosses find their way too; the gaps in shifting walls fit the boss.

## Non-goals

- Smoother turning, and CPU and memory work beyond what pathfinding needs. Those are follow-ups once this is measured in play.
- Different paths for different enemy sizes. One map serves every walker; a large body slides along the walls it brushes.
