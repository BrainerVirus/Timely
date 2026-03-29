/**
 * Public API for cross-feature reuse of settings components.
 * Setup wizard and other features should import from here rather than
 * reaching into internal settings paths.
 */

export { GitLabAuthPanel } from "@/features/settings/components/GitLabAuthPanel/GitLabAuthPanel";
export { ProviderSyncCard } from "@/features/settings/components/ProviderSyncCard/ProviderSyncCard";
export { WeekdayScheduleEditor } from "@/features/settings/components/WeekdayScheduleEditor/WeekdayScheduleEditor";
export {
  buildWeekdaySchedulesInput,
  createInitialScheduleFormState,
  formatNetHours,
  formatWeekdayScheduleHours,
  getEffectiveWeekStart,
  getOrderedWorkdays,
  scheduleFormReducer,
  WEEK_START_OPTIONS,
  type SchedulePhase,
  type WeekStartPreference,
  type WeekdayCode,
  type WeekdayScheduleFormRow,
} from "@/features/settings/hooks/schedule-form/schedule-form";
