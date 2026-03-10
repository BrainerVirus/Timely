# Worklog Period Picker Design

## Overview

Fix the Worklog period range picker so it behaves like a standard two-click range calendar and make each Worklog tab manage its own clean control state.

## Approved Decisions

- Keep committed Worklog data state separate from the in-progress calendar draft state.
- Use a true two-click range flow for the period calendar:
  - first click sets the start
  - second click sets the end
  - clicking the same day twice creates a one-day range
- If the popover closes with an incomplete draft, discard it and keep the last committed range.
- Allow free calendar navigation across months without forcing the calendar back to the committed range start.
- Keep day, week, and period controls in separate mode-local state buckets.
- Reset each tab to its clean default state when switching modes.

## Implementation Notes

- Refactor `src/features/worklog/worklog-page.tsx` reducer state so day, week, and period do not share the same control values.
- Add draft range and visible month state for the period picker popover.
- Apply the committed range only when the draft range is complete.
- Remove month locking that prevents normal calendar browsing.
- Preserve nested day route behavior while keeping control state local to the active mode.

## Success Criteria

- The period calendar supports standard two-click range selection.
- A same-day range can be created by clicking the same date twice.
- Users can navigate freely across months before completing the range.
- Incomplete drafts are discarded on close.
- Switching between day, week, and period resets each tab to its own clean default control state.
