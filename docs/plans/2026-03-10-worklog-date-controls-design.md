# Worklog Date Controls Design

## Overview

Align the Worklog page date controls so the right-side calendar trigger has one consistent compact size in day, week, and period modes.

## Approved Decisions

- Keep the left pager control as the single visible label for the active date or range.
- Keep day and week using a single-date calendar picker.
- Keep period using a true range picker in the popover.
- Change the period picker trigger to the same compact icon-only calendar button used by day and week.
- Match open and closed styling across all three triggers.

## Implementation Notes

- Add period picker open state to the Worklog UI reducer so it can share the same active styling model as day and week.
- Reuse one trigger style helper for the calendar buttons to avoid size drift.
- Preserve existing period range selection behavior in the popover calendar.
- Remove the redundant range text from the period trigger.

## Success Criteria

- The calendar trigger height and footprint match in day, week, and period modes.
- The period label is shown only by the left pager control.
- The period popover still supports true range selection.
