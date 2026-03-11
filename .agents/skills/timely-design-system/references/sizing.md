# Sizing

## Control sizing scale

Timely uses four sizing levels defined in `src/styles/globals.css`.

- `--control-height-default` = `40px`
- `--control-height-compact` = `32px`
- `--control-height-dense` = `36px`
- `--control-height-layout` = `48px`

## Standard rule

Use `40px` for almost all standard interactive controls:

- buttons
- inputs
- select and combobox triggers
- segmented controls in forms/settings
- save/reset/disconnect/sync section actions

## Compact rule

Use `32px` only for deliberate compact contexts:

- top-bar sync button
- tray utility actions
- compact icon buttons
- small pager internals when the surrounding UI is intentionally dense

## Dense rule

Use `36px` for internal rows, not triggers:

- dropdown items
- combobox option rows
- dense menu rows
- calendar internals when needed

## Layout rule

Use `48px` for chrome/layout only:

- top bars
- structural navigation containers

## Consistency requirements

- Do not mix `36px` triggers with `40px` fields in the same form.
- If a control behaves like a standard input/button, give it an explicit standard height.
- Prefer shared helpers like `controlHeightClasses` and related utilities in `src/lib/control-styles.ts`.

## Known exceptions

- Calendar chevrons can remain compact.
- The top-bar sync button stays compact.
- Some icon-only chrome controls may remain compact when they are secondary to the main action.
