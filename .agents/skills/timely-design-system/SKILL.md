---
name: timely-design-system
description: "Use this whenever working on Timely UI, styling, visual polish, component consistency, spacing, shadows, surfaces, interaction states, or control sizing. This skill is the entrypoint for Timely's full design system: claymorphism treatment, theme tokens, shared control sizes, button depth rules, component constraints, and consistency patterns. It should trigger for any request to add or revise Timely components so the app stays visually coherent instead of drifting into one-off styling."
---

# Timely Design System

Use this skill as the entrypoint for Timely's app-specific UI rules.

Timely is not a generic Tailwind or shadcn app. It uses a tactile claymorphism-inspired desktop interface with shared sizing, depth, and color rules. Before changing UI code, read the references that match the task.

## Read this first

- Read `references/foundation.md` for the overall visual language, tokens, and clay effect rules.
- Read `references/sizing.md` for control heights, compact exceptions, and when to use each size.
- Read `references/components.md` for component-level expectations and consistency rules.

## How to use this skill

- Start from existing primitives in `src/components/ui/` whenever possible.
- Prefer shared helpers and tokens over one-off Tailwind class bundles.
- Keep new UI aligned with Timely's tactile look: rounded edges, visible borders, inset field depth, raised surface depth, and clear pressed states.
- If a UI change introduces a new pattern, either extract it into a shared helper/primitive or document why it must remain custom.

## Workflow

1. Identify whether the task affects a primitive, a shared pattern, or a one-off feature surface.
2. Read the relevant reference docs before editing.
3. Reuse or extend the design system instead of duplicating near-identical styles.
4. Validate that the result matches nearby Timely controls in height, shadow treatment, and interaction behavior.

## Reference guide

- `references/foundation.md`
  - Theme tokens
  - clay shadows
  - borders, radii, surfaces
  - button depth rules
- `references/sizing.md`
  - control height scale
  - compact/dense/layout exceptions
  - button and field sizing policy
- `references/components.md`
  - primitives
  - segmented controls
  - icon buttons
  - pagers, dialogs, sheets, tray actions
  - implementation consistency rules

When in doubt, make the UI feel like it belongs to the same product as the rest of Timely, not just the same framework.
