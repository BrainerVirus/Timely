---
name: timely-clay-ui
description: "Use this whenever working on Timely UI code: adding or editing buttons, inputs, comboboxes, selects, toggles, cards, settings panels, dialogs, tray surfaces, or visual polish. This skill captures Timely's app-specific look and feel: claymorphism, orange/blue OKLCH tokens, chunky rounded controls, and the app-wide control sizing rules. It should also trigger for requests about consistency, spacing, control height, component polish, or matching existing Timely styling even if the user does not explicitly mention design systems or claymorphism."
---

# Timely Clay UI

Timely uses a custom claymorphism-inspired desktop UI, not stock shadcn defaults. Apply these rules whenever you touch interactive UI so new work matches the existing product.

## Core visual identity

- Use the existing theme tokens from `src/styles/globals.css` for color, radius, and shadow.
- Prefer warm, tactile surfaces: `bg-muted`, `bg-card`, `border-2`, `rounded-xl`/`rounded-2xl`.
- Preserve the orange primary and blue accent relationship already defined in the theme.
- Keep the UI expressive but sturdy: chunky corners, visible borders, inset shadows for controls, raised shadows for cards and popups.

## Clay treatment

- **Inputs and triggers**: use inset depth, usually `shadow-[var(--shadow-clay-inset)]`.
- **Cards and floating panels**: use raised depth, usually `shadow-[var(--shadow-clay)]` or `shadow-[var(--shadow-clay-popup)]`.
- **Active controls**: use stronger foreground contrast and a crisp offset shadow like `shadow-[2px_2px_0_0_var(--color-border)]` when already established.
- **Pressed state**: prefer `active:translate-y-[1px] active:shadow-none` for tactile feedback.

## Control sizing scale

Timely uses an explicit app-wide sizing system.

- `--control-height-default` = `40px` (`2.5rem`) for standard interactive controls
- `--control-height-compact` = `32px` (`2rem`) for compact utility actions only
- `--control-height-dense` = `36px` (`2.25rem`) for internal list/menu rows
- `--control-height-layout` = `48px` (`3rem`) for layout chrome, not normal controls

### Use `40px` for

- standard buttons
- text inputs
- select and combobox triggers
- segmented settings controls
- save, reset, disconnect, sync-now, detect, and other section-level actions

### Use `32px` for

- compact utility actions in chrome or very tight contexts
- the top-bar sync button
- intentionally compact helper actions only

### Use `36px` for

- dropdown option rows
- combobox list items
- dense calendar/menu internals

Do not mix `36px` and `40px` controls in the same form unless the smaller control is clearly an internal row rather than the main trigger.

## Primitive expectations

- `Button` default size should remain the standard action height.
- `Input`, `SelectTrigger`, `ComboboxInput`, and `InputGroup` should visually align.
- If you introduce a new input-like primitive, make its default height match the standard control height.
- Prefer shared primitives or shared helper classes over hand-written one-off `py-*` sizing.

## Styling patterns to preserve

- Use `font-display` for headings and emphasis moments, not generic bolding everywhere.
- Use `text-sm` as the default control text size unless the existing pattern needs `text-xs`.
- Use `rounded-xl` for most controls and `rounded-2xl` for card-like containers.
- Prefer `border-2` over thin borders for primary surfaces and controls.
- Keep focus states visible with ring/ring-offset patterns already used in buttons and inputs.

## Consistency rules

- When you notice repeated control recipes in feature files, extract or reuse helpers rather than copy a slightly different version.
- Avoid padding-only height definitions for standard controls when an explicit height token is more reliable.
- Preserve intentional exceptions: tiny icon affordances, calendar chevrons, dense list rows, and top-bar compact actions.
- If a screen already uses the Timely clay treatment, extend it; do not introduce a flat or generic style beside it.

## Quick checklist before finishing

- Does this control match the nearest comparable Timely control in height?
- Does it use the right clay depth: inset for fields, raised for surfaces?
- Does it use theme tokens rather than ad hoc colors?
- Does the active/pressed behavior feel tactile and consistent?
- If this is a new reusable pattern, should it live in `src/components/ui/` or `src/lib/` instead of staying inline?

## Good defaults

- Standard action button: `h-[var(--control-height-default)]`
- Standard field: `h-[var(--control-height-default)]`
- Segmented/chip control in settings: explicit default height, not `py-1.5`
- Popup/item rows: dense height is OK

When in doubt, choose the option that makes the UI look like it was built by the same designer as the rest of Timely.
