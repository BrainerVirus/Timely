import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { listenAppPreferencesChanged } from "@/app/desktop/TauriService/tauri";

import type {
  DayStatus,
  LanguagePreference,
  SupportedLocale,
  TimeFormat,
} from "@/shared/types/dashboard";

type TranslationPrimitive = string | number | boolean | null | undefined;
type TranslationParams = Record<string, TranslationPrimitive>;
type MessageValue = string | ((params: TranslationParams) => string);
type WeekdayFormatStyle = "short" | "narrow" | "long";

const SUPPORTED_LOCALES = ["en", "es", "pt"] as const satisfies readonly SupportedLocale[];

const enMessages = {
  "app.name": "Timely",
  "common.auto": "Auto (System)",
  "common.about": "About",
  "common.back": "Back",
  "common.calendar": "Calendar",
  "common.continue": "Continue",
  "common.day": "Day",
  "common.daysShort": "d",
  "common.days": ({ count }) => `${count} ${Number(count) === 1 ? "day" : "days"}`,
  "common.done": "Done",
  "common.failed": "Failed",
  "common.getStarted": "Get started",
  "common.hide": "Hide",
  "common.home": "Home",
  "common.issues": "Issues",
  "common.language": "Language",
  "common.loading": "Loading",
  "common.loadingApp": "Loading Timely",
  "common.month": "Month",
  "common.never": "Never",
  "common.next": "Next",
  "common.noFlags": "No flags",
  "common.notSet": "Not set",
  "common.open": "Open",
  "common.oauth": "OAuth",
  "common.period": "Period",
  "common.pickDay": "Pick day",
  "common.pickPeriod": "Pick period",
  "common.pickWeek": "Pick week",
  "common.quit": "Quit",
  "common.play": "Play",
  "common.previous": "Previous",
  "common.retry": "Retry",
  "common.saveAndContinue": "Save & continue",
  "common.searchCountry": "Search country",
  "common.searchTimezone": "Search timezone",
  "common.search": "Search...",
  "common.settings": "Settings",
  "common.skipForNow": "Skip for now",
  "common.sync": "Sync",
  "common.syncNow": "Sync now",
  "common.syncing": "Syncing...",
  "common.thisPeriod": "This period",
  "common.thisWeek": "This week",
  "common.today": "Today",
  "common.viewLog": "View log",
  "common.week": "Week",
  "common.worklog": "Worklog",
  "common.year": "Year",
  "common.thisYear": "This year",
  "common.noResults": "No results found.",
  "common.none": "None",
  "common.english": "English",
  "common.spanish": "Spanish",
  "common.portuguese": "Portuguese",
  "common.hoursShort": "h",
  "common.minutesShort": "min",
  "timeInput.hours": "Hours",
  "timeInput.minutes": "Minutes",
  "timeInput.period": "AM or PM",
  "common.status.empty": "empty",
  "common.status.underTarget": "under target",
  "common.status.onTrack": "on track",
  "common.status.metTarget": "met target",
  "common.status.overTarget": "over target",
  "common.status.nonWorkday": "non workday",
  "common.severity.high": "high",
  "common.severity.medium": "medium",
  "common.severity.low": "low",
  "sync.statusAria": ({ status }) => `Sync status: ${status}`,
  "sync.logTitle": "Sync log",
  "sync.logDescription": "Live sync progress and recent activity notes.",
  "sync.done": "Done",
  "sync.failed": "Failed",
  "sync.starting": "Starting sync...",
  "sync.noEntries": "No log entries yet. Start a sync first.",
  "sync.toastCompleteTitle": "Sync complete",
  "sync.toastCompleteDescription": ({ projects, entries, issues }) =>
    `${projects} projects, ${entries} entries, ${issues} issues synced.`,
  "sync.toastFailedTitle": "Sync failed",
  "topBar.lastSynced": ({ value }) => `Last synced: ${value}`,
  "topBar.sync": "Sync",
  "app.failedToLoad": "Failed to load Timely",
  "app.loadingWorklog": "Loading worklog",
  "app.loadingPlayCenter": "Loading play center",
  "play.failedToLoadTitle": "Failed to load play center",
  "play.failedToLoadDescription": "Play center is unavailable right now.",
  "app.loadingSettings": "Loading settings",
  "app.loadingSetup": "Loading setup",
  "app.loadingProviderSetup": "Loading provider setup",
  "app.loadingScheduleSetup": "Loading schedule setup",
  "app.loadingSyncSetup": "Loading sync setup",
  "app.loadingFinishScreen": "Loading finish screen",
  "home.finishSetup": "Finish setting up your workspace to unlock all features.",
  "home.continueSetup": "Continue setup",
  "home.heroToday": "Today",
  "home.heroLogged": "Logged",
  "home.heroRemaining": "Remaining",
  "home.heroStreak": "Streak",
  "home.heroLoggedPill": ({ hours }) => `Logged ${hours}`,
  "home.heroRemainingPill": ({ hours }) => `${hours} left`,
  "home.heroTargetDonePill": "Target done",
  "home.heroStreakPill": ({ streak }) => `Streak ${streak}`,
  "home.heroRestDayPill": ({ companion }) => `${companion} is off duty`,
  "home.heroNoTargetPill": "No target today",
  "home.heroStreakSafePill": ({ streak }) => `Streak safe ${streak}`,
  "home.ofTarget": ({ target }) => `of ${target} target`,
  "home.stillToLog": "still to log",
  "home.targetCleared": "target cleared",
  "home.momentumAlive": "momentum alive",
  "home.readyToStart": "ready to start",
  "home.openToday": "Open today",
  "home.openThisWeek": "Open this week",
  "home.openThisPeriod": "Open this period",
  "home.compareDailyLoad": "Compare daily load",
  "home.reviewRangeSummary": "Review range summary",
  "home.todayAtAGlance": "Today at a glance",
  "home.todayFocus": "Today focus",
  "home.todayFocusNote": "Your biggest slices of time so far.",
  "home.cleanSlate": "A clean slate today.",
  "home.noIssuesToday": "No issues logged today",
  "home.noIssuesTodayDescription": "Start tracking time to see your focus list come alive.",
  "home.momentum": "Momentum",
  "home.momentumNote": "A quick pulse of this week, plus your running streak.",
  "home.ctaToday": "Open today log",
  "home.ctaWeek": "Review this week",
  "home.ctaWeekNote": "See each day's pace",
  "home.ctaPeriod": "Inspect date range",
  "home.ctaPeriodNote": "Check broader trends",
  "home.petPanelTitle": "Companion status",
  "home.petMoodCalm": "Calm",
  "home.petMoodCurious": "Curious",
  "home.petMoodFocused": "Focused",
  "home.petMoodHappy": "Happy",
  "home.petMoodExcited": "Excited",
  "home.petMoodCozy": "Cozy",
  "home.petMoodPlayful": "Playful",
  "home.petMoodTired": "Tired",
  "home.petMoodDrained": "Drained",
  "home.petMetricStreak": "Streak",
  "home.petMetricFocus": "Focus",
  "home.petMetricRhythm": "Rhythm",
  "home.weeklyProgressTitle": "This week's progress",
  "home.weeklyProgressNote": "Logged hours against each workday target.",
  "home.weeklyOffLabel": "off day",
  "home.streakPanelTitle": "Current streak",
  "home.streakPanelNote": "Keep the chain alive and let the week stay warm.",
  "home.weeklyPulse": "Weekly pulse",
  "home.thisWeek": "This week",
  "home.weeklyRhythmEmpty": "Sync your data to see your weekly rhythm appear here.",
  "home.streakEmpty": "Sync your data to see your current streak appear here.",
  "home.statusTempo": ({ companion, tempo }) => `${companion} is on ${tempo}`,
  "home.headlineVictoryTitle": ({ alias }) => `Nice run, ${alias}.`,
  "home.headlineVictoryTempo": "victory mode",
  "home.headlineVictorySupporting": "You already cleared your target.",
  "home.headlineVictoryDetail": "Now it is all about keeping the finish tidy.",
  "home.headlineFocusTitle": ({ alias }) => `Steady rhythm, ${alias}.`,
  "home.headlineFocusTempo": "focus mode",
  "home.headlineFocusSupporting": "The day is moving in the right direction.",
  "home.headlineFocusDetail": "A couple of solid sessions should close the gap.",
  "home.headlineWeekendTitle": ({ alias }) => `Easy pace, ${alias}.`,
  "home.headlineWeekendTempo": "weekend mode",
  "home.headlineWeekendSupporting": "No work target today.",
  "home.headlineWeekendDetail": "Use the quiet space to recharge or tidy light tasks.",
  "home.headlineWarmupTitle": "A clean page for today.",
  "home.headlineWarmupTempo": "warm-up mode",
  "home.headlineWarmupSupporting": "Your fox is waiting for the first tracked block.",
  "home.headlineWarmupDetail": "One focused session is enough to get momentum started.",
  "home.headlineVictoryA": ({ alias }) => `You closed today strong, [[${alias}]].`,
  "home.headlineVictoryB": ({ alias }) => `Target cleared. Nice finish, [[${alias}]].`,
  "home.headlineFocusA": ({ alias }) => `The day is lining up well, [[${alias}]].`,
  "home.headlineFocusB": ({ alias }) => `Steady pace, [[${alias}]]. The lane is open.`,
  "home.headlineWeekendA": ({ alias }) => `Quiet tempo today, [[${alias}]].`,
  "home.headlineWeekendB": ({ alias }) => `A lighter day fits you, [[${alias}]].`,
  "home.headlineHolidayA": ({ alias }) => `Holiday mode suits you, [[${alias}]].`,
  "home.headlineHolidayB": ({ alias }) => `A softer holiday pace works here, [[${alias}]].`,
  "home.headlineWarmupA": ({ alias }) => `A fresh page is waiting, [[${alias}]].`,
  "home.headlineWarmupB": ({ alias }) =>
    `The board is clear, [[${alias}]]. Time to start the rhythm.`,
  "home.insightTopIssueA": ({ companion, issueKey, hours }) =>
    `[[${companion}]] keeps pointing back to [[${issueKey}]]. You already poured [[${hours}]] into it, so that thread is leading the day.`,
  "home.insightTopIssueB": ({ companion, issueKey, hours }) =>
    `Right now [[${issueKey}]] is your biggest pull. [[${companion}]] can already see [[${hours}]] stacked there.`,
  "home.insightTopIssueC": ({ companion, issueKey, hours }) =>
    `Your clearest trail today runs through [[${issueKey}]]. [[${companion}]] has watched [[${hours}]] land on that same thread.`,
  "home.insightWeekA": ({ companion, hours }) =>
    `[[${companion}]] has watched [[${hours}]] land across the visible week, so even a quieter day still sits on top of real momentum.`,
  "home.insightWeekB": ({ companion, hours }) =>
    `The week already holds [[${hours}]] of work. [[${companion}]] reads that as a rhythm worth protecting.`,
  "home.insightWeekC": ({ companion, hours }) =>
    `There are already [[${hours}]] in the week behind you. [[${companion}]] is treating today like the next clean step, not a reset.`,
  "home.insightNonWorkdayLoggedA": ({ companion, hours }) =>
    `[[${companion}]] noticed the optional [[${hours}]] today. Nice and light still counts as care.`,
  "home.insightNonWorkdayLoggedB": ({ companion, hours }) =>
    `Even on a day off, [[${companion}]] can see [[${hours}]] of light progress. Clean, calm, and enough.`,
  "home.insightNonWorkdayRestA": ({ companion, holiday }) =>
    holiday
      ? `[[${companion}]] is keeping things gentle for [[${holiday}]]. Today is for rest, not chasing the bar.`
      : `[[${companion}]] is keeping watch over a true day off. No target to chase, just space to breathe.`,
  "home.insightNonWorkdayRestB": ({ companion, holiday }) =>
    holiday
      ? `[[${holiday}]] shifts the whole pace. [[${companion}]] would rather see you recharge than force momentum.`
      : `Today stays outside the normal work rhythm. [[${companion}]] reads that as room to recover, not lost progress.`,
  "home.insightStartA": ({ companion }) =>
    `[[${companion}]] is calm and waiting for the first real move. Once an issue lands, this page becomes your mission desk.`,
  "home.insightStartB": ({ companion }) =>
    `No big signal yet, but [[${companion}]] is ready. One logged block is enough to wake the whole page up.`,
  "home.insightStartC": ({ companion }) =>
    `[[${companion}]] is stretching before the first sprint. The moment you log the opening block, the day starts to take shape here.`,
  "home.insightTopIssue": ({ companion, issueKey, hours }) =>
    `${companion} says your biggest quest so far is ${issueKey}. You have already spent ${hours} there, so that thread is clearly where the day is unfolding.`,
  "home.insightWeekLogged": ({ companion, hours }) =>
    `${companion} has clocked ${hours} across the visible week. Even if today is quiet, your recent rhythm is still telling a story worth following.`,
  "home.insightStart": ({ companion }) =>
    `${companion} is stretching before the first sprint. Once your first issue lands, this page turns into your little mission control.`,
  "home.petCalmA": ({ companion, consistency }) =>
    `[[${companion}]] is calm right now. Your [[${consistency}]] rhythm says there is still room to build momentum without rushing.`,
  "home.petCalmB": ({ companion, focus }) =>
    `[[${companion}]] is resting in calm mode. A little more than [[${focus}]] of focused work would already change the tone of the day.`,
  "home.petFocusedA": ({ companion, focus, streak }) =>
    `[[${companion}]] is locked in. With [[${focus}]] of focus and a [[${streak}]] streak, the next session can push the day forward cleanly.`,
  "home.petFocusedB": ({ companion, consistency }) =>
    `[[${companion}]] looks focused and ready. The current [[${consistency}]] rhythm says your habits are holding together.`,
  "home.petHappyA": ({ companion, streak, consistency }) =>
    `[[${companion}]] looks happy. A [[${streak}]] streak plus [[${consistency}]] consistency makes the whole desk feel under control.`,
  "home.petHappyB": ({ companion, focus }) =>
    `[[${companion}]] is in a good mood. Today's [[${focus}]] of focused time already feels like a solid base.`,
  "home.petExcitedA": ({ companion, streak }) =>
    `[[${companion}]] is excited and wants to keep the [[${streak}]] streak burning. This is the moment to ride the energy.`,
  "home.petExcitedB": ({ companion, consistency }) =>
    `[[${companion}]] is buzzing. A [[${consistency}]] rhythm like this makes the whole run feel alive.`,
  "home.petNonWorkdayRestA": ({ companion }) =>
    `[[${companion}]] is taking the scenic route today. A proper day off helps the whole week breathe.`,
  "home.petNonWorkdayRestB": ({ companion, streak }) =>
    `[[${companion}]] is calm and curled up. Your [[${streak}]] streak is safe, so there is no need to push today.`,
  "home.petNonWorkdayActiveA": ({ companion, hours }) =>
    `[[${companion}]] likes this kind of quiet progress. [[${hours}]] on a day off keeps things playful, not heavy.`,
  "home.petNonWorkdayActiveB": ({ companion, hours }) =>
    `[[${companion}]] saw [[${hours}]] land softly today. Enough to feel alive, not enough to steal your rest.`,
  "worklog.weeklyBreakdown": "Weekly breakdown",
  "worklog.weeklyBreakdownNote": ({ range }) => `${range}. Pick a day to open its full summary.`,
  "worklog.weekSummary": "Week summary",
  "worklog.periodSummary": "Period summary",
  "worklog.selectedRange": ({ range }) => `Selected range: ${range}`,
  "worklog.daySummary": "Day summary",
  "worklog.weekOf": ({ date }) => `Week of ${date}`,
  "worklog.backTo": ({ parent }) => `Back to ${parent}`,
  "worklog.auditFlags": "Audit Flags",
  "worklog.auditFlagsDescription":
    "Review the items that may need attention for this selected slice.",
  "worklog.noIssuesForDay": "No issues logged for this day",
  "worklog.noIssuesForDayDescription": "Pick a different date or log some time.",
  "worklog.logged": "Logged",
  "worklog.loggedNote": "Tracked for the selected day",
  "worklog.target": "Target",
  "worklog.targetNote": "Planned load",
  "worklog.delta": "Delta",
  "worklog.deltaPositive": "At or above target",
  "worklog.deltaNegative": "Still remaining",
  "worklog.issuesCount": "Issues",
  "worklog.noAuditFlags": "No audit flags",
  "worklog.auditFlagCount": ({ count }) => `audit ${Number(count) === 1 ? "flag" : "flags"}`,
  "worklog.noIssues": "No issues logged for this day",
  "worklog.pickDifferentDate": "Pick a different date or log some time.",
  "worklog.targetLabel": ({ hours }) => `target ${hours}`,
  "worklog.failedToLoadTitle": "Failed to load worklog",
  "worklog.gitlabConnectionRequired": "Connect GitLab in Settings to load your worklog.",
  "dashboard.weekTitle": "Week",
  "dashboard.weekNote": "Hours across the current week.",
  "dashboard.loggedTime": "Logged",
  "dashboard.loggedAcrossRange": "In this range",
  "dashboard.expectedHours": "Expected",
  "dashboard.expectedThroughYesterday": "Through yesterday",
  "dashboard.expectedThroughYesterdayNote": "Up to yesterday.",
  "dashboard.expectedForRange": "Range total",
  "dashboard.expectedForRangeNote": "Through the selected end.",
  "dashboard.missingHours": "Missing",
  "dashboard.missingHoursNote": "Still to reach the plan.",
  "dashboard.targetTime": "Target",
  "dashboard.expectedLoad": "Planned for this range",
  "dashboard.cleanDays": "Days within target",
  "dashboard.overflowCount": ({ count }) =>
    `${count} ${Number(count) === 1 ? "day" : "days"} over target`,
  "dashboard.dailyBreakdown": "Daily breakdown",
  "dashboard.pickDayToOpen": "Pick a day to open its full summary.",
  "settings.connection": "Connection",
  "settings.providerSync": "Provider sync",
  "settings.connectedTo": ({ host }) => `Connected to ${host}`,
  "settings.notConnected": "Not connected",
  "settings.schedule": "Schedule",
  "settings.schedulePreferences": "Schedule Preferences",
  "settings.schedulePreferencesHint":
    "Timezone, first day of the week, and duration format work together with your weekly hours above.",
  "settings.calendarAndHolidays": "Calendar & Holidays",
  "settings.appearance": "Appearance",
  "settings.accessibility": "Accessibility",
  "settings.theme": "Theme",
  "settings.motionPreference": "Motion",
  "settings.motionPreferenceDescription":
    "Control decorative motion across Timely. System follows your OS accessibility setting.",
  "settings.motionSystem": "System",
  "settings.motionReduced": "Reduced",
  "settings.motionFull": "Full",
  "settings.motionSummary": ({ mode }) => `Motion: ${mode}`,
  "settings.timeFormat": "Time format",
  "settings.hoursAndMinutes": "Hours & minutes",
  "settings.decimal": "Decimal",
  "settings.durationHint": "Controls how durations are shown across the entire app.",
  "settings.hoursPerDaySummary": ({ hours }) => `${hours}h/day`,
  "settings.sync": "Sync",
  "settings.dataManagement": "Data Management",
  "settings.resetDataDescription":
    "Reset all local data including connections, time entries, and settings.",
  "settings.resetAllData": "Reset all data",
  "settings.shiftStart": "Shift start",
  "settings.shiftEnd": "Shift end",
  "settings.lunchBreak": "Lunch break",
  "settings.netHoursPerDay": "Net hours/day",
  "settings.netHoursShort": "Net",
  "settings.scheduleByDay": "Schedule by day",
  "settings.weeklySchedule": "Weekly schedule",
  "settings.weeklyScheduleDescription": "Set the normal hours for each day of your workweek.",
  "settings.workingDay": "Workday",
  "settings.workingHours": "Working hours",
  "settings.dayOff": "Day off",
  "settings.workWeek": "Work week",
  "settings.previewWeekLabel": ({ range }) => `Preview week: ${range}`,
  "settings.quickPresets": "Quick presets",
  "settings.standardWorkweek": "Standard workweek",
  "settings.shortFridayPreset": "Short Friday",
  "settings.customPreset": "Custom",
  "settings.applyToMatchingDays": "Apply to matching days",
  "settings.applyToSelectedDays": "Apply to selected days",
  "settings.applyToWholeWeek": "Apply to whole week",
  "settings.wholeWeekLabel": "All 7 days",
  "settings.hours": "Hours",
  "settings.holidayShort": "Holiday",
  "settings.copyToDays": "Copy to...",
  "settings.copyDayScheduleTitle": ({ day }) => `Copy ${day} hours`,
  "settings.copyDayScheduleHint": "Choose the weekdays that should use this schedule.",
  "settings.copyDayScheduleEmpty": "Choose at least one day.",
  "settings.copyDayScheduleApply": "Apply",
  "settings.setupDayOffHint": "This day stays out of your weekly target until you turn it on.",
  "settings.timezone": "Timezone",
  "settings.firstDayOfWeek": "First day of week",
  "settings.workdays": "Workdays",
  "settings.syncNow": "Sync now",
  "settings.lastSyncEntries": ({ count }) => `Last sync: ${count} entries synced`,
  "settings.pullLatest": "Pull the latest data from GitLab",
  "settings.autoSync": "Auto-sync",
  "settings.autoSyncDescription": "Automatically pull data from GitLab in the background",
  "settings.syncInterval": "Sync interval",
  "settings.intervalMinutes": ({ count }) => `${count} min`,
  "settings.intervalHours": ({ count }) => `${count} ${Number(count) === 1 ? "hour" : "hours"}`,
  "settings.manualOnly": "Manual only",
  "settings.everyInterval": ({ interval }) => `Every ${interval}`,
  "settings.windowBehavior": "Window & tray",
  "settings.showTrayIcon": "Show tray icon",
  "settings.showTrayIconDescription":
    "Keep Timely available from the system tray while it runs in the background.",
  "settings.closeButtonAction": "When closing the window",
  "settings.closeButtonActionDescription":
    "The close button minimizes Timely to the tray instead of quitting.",
  "settings.closeActionMinimizeToTray": "Minimize to tray",
  "settings.closeActionQuit": "Quit app",
  "settings.traySummaryCloseToTray": "Tray on · close button minimizes to tray",
  "settings.traySummaryKeepTray": "Tray on · close button quits the app",
  "settings.traySummaryDisabled": "Tray off · close button quits the app",
  "settings.remindersSection": "Reminders",
  "settings.remindersSummaryOff": "Reminders off",
  "settings.remindersSummaryOn": ({ list }) => `On · ${list}`,
  "settings.remindersNoTimes": "no times selected",
  "settings.remindersMaster": "Workday reminders",
  "settings.remindersMasterDescription":
    "Short desktop notices before your shift ends so you can wrap up logging.",
  "settings.remindersBeforeShiftEnd": "Minutes before shift ends",
  "settings.remindersMinutesLabel": ({ minutes }) => `${minutes} minutes`,
  "settings.remindersPermission": "Desktop notice permission",
  "settings.remindersPermissionUnknown":
    "Status unknown — if nothing appears, check Timely in your system privacy settings.",
  "settings.remindersPermissionGranted": "Allowed — notices from Timely can appear.",
  "settings.remindersPermissionDenied":
    "Blocked — turn on Timely in your system settings under Notifications.",
  "settings.remindersPermissionPrompt": "Not decided yet — your system may prompt next time.",
  "settings.remindersRequestPermission": "Ask the system",
  "settings.remindersPermissionRequestFailed": "Could not request notice permission",
  "settings.remindersTest": "Send test notice",
  "settings.remindersTestDescription": "Shows one sample notice using your current settings.",
  "settings.remindersTestTitle": "Timely test",
  "settings.remindersTestBody": "If you can read this, workday notices are working.",
  "settings.remindersTestSent": "Test notice sent",
  "settings.remindersTestFailed": "Could not send test notice",
  "settings.diagnosticsSection": "Diagnostics",
  "settings.diagnosticsSummary": ({ count }) => `${count} entries`,
  "settings.remindersPermissionHintInteractive":
    "This button can trigger a system prompt on this platform.",
  "settings.remindersPermissionHintSystemSettings":
    "This platform usually needs changes in system notification settings.",
  "settings.remindersPermissionNoSystemPrompt": "No system prompt appeared",
  "settings.remindersPermissionNoChangeInteractive":
    "Permission state did not change. If no prompt appeared, check your system notification settings.",
  "settings.remindersPermissionNoChangeSystemSettings":
    "No runtime prompt is available here. Open your system notification settings for Timely.",
  "settings.remindersOpenSystemSettings": "Open system settings",
  "settings.remindersOpenSystemSettingsSuccess": "System notification settings opened",
  "settings.remindersOpenSystemSettingsFailed": "Could not open system notification settings",
  "settings.remindersPermissionDeniedCannotSend":
    "Timely is blocked in your system notification settings. Allow notifications, then retry.",
  "settings.remindersDiagnosticsTitle": "Diagnostics console",
  "settings.remindersDiagnosticsDescription":
    "Use this console when reminders fail. You can refresh, clear, copy, or export the latest entries.",
  "settings.remindersDiagnosticsCount": ({ count }) => `${count} entries`,
  "settings.diagnosticsFeatureFilter": "Feature",
  "settings.diagnosticsFeatureFilterAll": "All",
  "settings.diagnosticsFeatureFilterNotifications": "Notifications",
  "settings.remindersDiagnosticsRefresh": "Refresh",
  "settings.remindersDiagnosticsClear": "Clear logs",
  "settings.remindersDiagnosticsCopy": "Copy report",
  "settings.remindersDiagnosticsExport": "Export report",
  "settings.remindersDiagnosticsLoading": "Loading diagnostics...",
  "settings.remindersDiagnosticsEmpty": "No diagnostics entries yet.",
  "settings.remindersDiagnosticsCleared": "Diagnostics logs cleared",
  "settings.remindersDiagnosticsClearFailed": "Could not clear diagnostics logs",
  "settings.remindersDiagnosticsCopied": "Diagnostics report copied",
  "settings.remindersDiagnosticsCopyFailed": "Could not copy diagnostics report",
  "settings.remindersDiagnosticsExported": "Diagnostics report exported",
  "settings.remindersDiagnosticsExportFailed": "Could not export diagnostics report",
  "settings.saveSchedule": "Save schedule",
  "settings.savingSchedule": "Saving changes...",
  "settings.scheduleSaved": "Schedule saved",
  "settings.scheduleSaveToastSuccessTitle": "Schedule updated",
  "settings.scheduleSaveToastSuccessDescription":
    "Your weekly hours, timezone, and first day of the week are saved. Worklog and daily targets use the new values now.",
  "settings.scheduleSaveToastErrorTitle": "Could not save schedule",
  "settings.scheduleSaveToastErrorFallback":
    "Something went wrong while saving. Please try again.",
  "settings.updates": "Updates",
  "settings.updatesOverviewTitle": "Build details",
  "settings.updatesInstalledVersion": "Installed version",
  "settings.updatesInstalledVersionHint": "Version currently installed on this device.",
  "settings.updatesReleaseChannel": "Build channel",
  "settings.updatesReleaseChannelHint": "Channel baked into this desktop build.",
  "settings.updatesDescription":
    "Check the latest release for your selected update channel and install it when ready.",
  "settings.updatesIdleDescription":
    "Choose a channel, then check for the newest release available to this app.",
  "settings.updatesToastChecking": "Looking for a newer release for the selected channel.",
  "settings.updatesToastInstalling": "Downloading and preparing the selected update.",
  "settings.updatesToastRestarting": "Restarting Timely to finish the update.",
  "settings.updatesChannel": "Update channel",
  "settings.updatesChannelStable": "Stable",
  "settings.updatesChannelUnstable": "Unstable",
  "settings.updatesChannelHint":
    "Stable gets production releases. Unstable gets prerelease builds first.",
  "settings.updatesBuildChannelStable": "Stable build",
  "settings.updatesBuildChannelUnstable": "Unstable build",
  "settings.updatesSummary": ({ channel }) => `Tracking ${channel}`,
  "settings.updatesAvailableShort": ({ version }) => `Update ${version} available`,
  "settings.updatesReadyShort": "Ready to restart",
  "settings.updatesReady": ({ version }) => `Update ${version} is ready`,
  "settings.updatesAvailable": ({ version }) => `Update ${version} available`,
  "settings.updatesReadyDescription":
    "The update has been installed. Restart Timely to finish applying it.",
  "settings.updatesAvailableDescription": "A newer build is available for the selected channel.",
  "settings.updatesPublishedOn": ({ date }) => `Published on ${date}`,
  "settings.updatesReleaseNotes": "Release notes",
  "settings.updatesDownloadProgress": ({ progress }) => `Downloading ${progress}`,
  "settings.updatesUnknownProgress": "Downloading update...",
  "settings.updatesUpToDate": "You are up to date",
  "settings.updatesNoUpdate": "No newer release is available for this channel right now.",
  "settings.updatesCheckFailed": "Could not check for updates",
  "settings.updatesInstallFailed": "Could not install the update",
  "settings.updatesChecking": "Checking...",
  "settings.updatesCheck": "Check for updates",
  "settings.updatesInstall": "Install update",
  "settings.updatesInstalling": "Installing...",
  "settings.updatesRestart": "Restart to update",
  "settings.updatesRestartFailed": "Could not restart to finish the update",
  "settings.updatesChannelSaveFailed": "Failed to save update channel",
  "settings.aboutSectionTitle": "About",
  "settings.aboutSectionDescription":
    "Check the installed version and release channel for this build.",
  "settings.viewAppDetails": "View app details",
  "settings.themeSummary": ({ theme }) => `Theme: ${theme}`,
  "settings.failedHolidayPreferences": "Failed to save holiday preferences",
  "settings.failedSchedule": "Failed to save schedule",
  "settings.tryAgain": "Please try again.",
  "settings.system": "System",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.languageSummary": ({ language }) => `Language: ${language}`,
  "settings.accessibilitySummary": ({ language }) => `Language: ${language}`,
  "settings.holidaySource": "Holiday source",
  "settings.detected": "Detected",
  "settings.useDetected": "Use detected",
  "settings.holidays": "Holidays",
  "settings.noCountry": "No country",
  "settings.noHolidaysForYear": ({ year }) => `No holidays available for ${year}.`,
  "settings.couldNotLoadHolidays": "Could not load holidays.",
  "providers.connectGitLab": "Connect GitLab",
  "providers.linkGitLab": "Link your GitLab account to start tracking time.",
  "providers.accessToken": "Access Token",
  "providers.quick": "quick",
  "providers.gitLabHost": "GitLab host",
  "providers.personalAccessToken": "Personal Access Token",
  "providers.needToken": "Need a token?",
  "providers.createOneOn": ({ host }) => `Create one on ${host}`,
  "providers.withReadApiScope": "with read_api scope.",
  "providers.connectWithToken": "Connect with Token",
  "providers.oauthAppId": "OAuth Application ID",
  "providers.createOAuthApp": "Create an OAuth app",
  "providers.oauthScopes":
    "with scopes read_api and read_user. Set the redirect URI to timely://auth/gitlab",
  "providers.waitingForAuthorization": "Waiting for GitLab authorization...",
  "providers.completeSignIn":
    "Complete the sign-in in the auth window. The app will detect the callback automatically.",
  "providers.pasteCallbackManually": "Callback didn't work? Paste it manually",
  "providers.connectWithGitLab": "Connect with GitLab",
  "providers.validatingToken": "Validating token...",
  "providers.authenticatedAs": ({ username, name }) => `Authenticated as @${username} (${name})`,
  "providers.connectedToHost": ({ host }) => `Connected to ${host}`,
  "providers.disconnect": "Disconnect",
  "providers.gitLabLinked": "GitLab linked",
  "providers.oauthComplete": "OAuth authentication complete.",
  "providers.oauthFailed": "OAuth failed",
  "providers.oauthCallbackFailed": ({ error }) => `OAuth callback failed: ${error}`,
  "providers.hostAndClientRequired": "Host and Client ID are required for OAuth.",
  "providers.connectionFailed": "Connection failed",
  "providers.hostAndTokenRequired": "Host and Personal Access Token are required.",
  "providers.connectedToGitLab": "Connected to GitLab",
  "providers.tokenSavedFor": ({ host }) => `Token saved for ${host}`,
  "providers.tokenValidated": "Token validated",
  "providers.authenticatedUser": ({ username }) => `Authenticated as @${username}`,
  "providers.tokenValidationFailed": "Token validation failed",
  "providers.manualCallbackPrompt": "Paste the callback URL from your browser:",
  "providers.manualCallbackResolved": "OAuth callback resolved manually.",
  "providers.callbackValidationFailed": ({ error }) => `Callback validation failed: ${error}`,
  "providers.oauthPkceFallback": "OAuth PKCE + PAT fallback",
  "providers.oauthPkce": "OAuth PKCE",
  "about.title": "About Timely",
  "about.subtitle": "Build details for your installed desktop app.",
  "about.versionLabel": "Version",
  "about.desktopBuild": "Desktop build",
  "about.prereleaseTitle": "Prerelease channel",
  "about.prereleaseDescription": ({ label }) => `You are running prerelease build ${label}.`,
  "releaseHighlights.dialogTitle": "What’s new in Timely",
  "releaseHighlights.dialogDescription": ({ version }) =>
    `Review the highlights for Timely version ${version}.`,
  "releaseHighlights.gotIt": "Got it",
  "onboarding.welcomeDescription":
    "Your personal time-tracking dashboard that syncs with GitLab. Let's take a quick tour so you can see how everything works.",
  "onboarding.progressDescription":
    "The progress ring shows how close you are to your daily target. It fills up as you log more time throughout the day.",
  "onboarding.issuesDescription":
    "See exactly which issues you spent time on today, sorted by hours. Each entry maps to a GitLab issue from your synced projects.",
  "onboarding.weekDescription":
    "A visual breakdown of your week showing daily logged hours vs. your target. Spot trends and stay consistent.",
  "onboarding.worklogDescription":
    "Dive deeper into your time entries. Switch between views to inspect daily, weekly, or monthly worklogs and audit flags.",
  "onboarding.settingsDescription":
    "Head here to connect your GitLab account using a Personal Access Token or OAuth. Once connected, hit Sync to pull your real time entries.",
  "onboarding.doneDescription":
    "That's the tour! Connect your GitLab account in Settings to start tracking your real hours. Happy tracking!",
  "setup.welcomeTitle": "Welcome to Timely",
  "setup.welcomeDescription": "Your personal worklog companion. Let's set up your workspace.",
  "setup.scheduleTitle": "When do you work?",
  "setup.scheduleDescription": "Define your shift hours and working days",
  "setup.providerTitle": "Connect GitLab",
  "setup.providerDescription": "Link your account to start tracking time",
  "setup.syncTitle": "Sync your data",
  "setup.syncDescriptionConnected": "Pulling your worklogs from GitLab",
  "setup.syncDescriptionDisconnected": "You can sync later from Settings",
  "setup.noProviderYet": "No provider connected yet. You can sync after setup.",
  "setup.syncComplete": "Sync complete",
  "setup.doneTitle": "You're all set!",
  "setup.doneDescription": "Your workspace is ready. Time to start tracking!",
  "setup.finishing": "Finishing setup...",
  "setup.openTimely": "Open Timely",
  "setup.continueButton": "Continue",
  "setup.connectionGuideTitle": "Finish connecting GitLab",
  "setup.connectionGuideIntro":
    "You skipped the wizard, so let's finish the remaining setup here in Settings by connecting GitLab with a Personal Access Token or OAuth.",
  "setup.connectionGuideConnectionSection":
    "This connection section is where Timely links to GitLab. Choose the quickest path for you, connect, then sync your data.",
  "setup.connectionGuidePat":
    "Access Token is the fastest option. This link opens GitLab's token page in your browser so you can create a token with read_api scope and paste it back here.",
  "setup.connectionGuideOauthTab":
    "OAuth is the browser-based option. Use it if you prefer authorizing through a GitLab app instead of manually creating a token.",
  "setup.connectionGuideOauthLink":
    "This opens GitLab's Applications page in your browser. Create an app, set the redirect URI to timely://auth/gitlab, then copy the Application ID back here.",
  "setup.connectionGuideSync":
    "After connecting with either method, press Sync here in the top bar to pull your GitLab worklogs into Timely.",
  "play.feeling": ({ mood }) => `Mood: ${mood}`,
  "play.level": "Level",
  "play.xp": "XP",
  "play.streak": "Streak",
  "play.tokens": "Tokens",
  "play.storeTitle": "Den store",
  "play.inventoryTitle": "Collection",
  "play.storeDescription": "Spend tokens on clay goodies for your companion and den.",
  "play.storeFeatured": "Featured picks",
  "play.storeCompanions": "Companion line",
  "play.storeAccessories": "Accessory shelf",
  "play.storeFeaturedDescription": "Flashier rewards with a little more swagger.",
  "play.storeCompanionsDescription": "Big unlocks for your fox crew and identity.",
  "play.storeAccessoriesDescription": "Everyday wearables and small clay treasures.",
  "play.storeBrowseTitle": "Browse the den store",
  "play.storeBrowseDescription":
    "Pick a section, narrow the shelf, and preview combinations before you buy.",
  "play.storeBrowseCount": ({ count }) => `${count} rewards in this view`,
  "play.storeTabAll": "All",
  "play.storeTabFeatured": "Featured",
  "play.storeTabCompanions": "Companions",
  "play.storeTabAccessories": "Accessories",
  "play.storeSecondaryFilters": "Store filters",
  "play.filterAll": "All",
  "play.filterOwned": "Owned",
  "play.filterLocked": "Locked",
  "play.filterHabitats": "Habitats",
  "play.filterWearables": "Wearables",
  "play.filterRecovery": "Recovery",
  "play.emptyStoreFilterTitle": "Nothing in this shelf yet",
  "play.emptyStoreFilterDescription": "Try another section or filter to see more rewards.",
  "play.clearPreview": "Clear all preview",
  "play.pageLabel": ({ current, total }) => `Page ${current} of ${total}`,
  "play.shopRouteDescription": "Visible item cards, quick previews, and direct purchase actions.",
  "play.collectionRouteDescription":
    "Everything your fox owns, with direct equip and preview controls.",
  "play.missionsRouteDescription": "Track, activate, and claim your daily and weekly goals.",
  "play.achievementsRouteDescription": "Unlocked milestones and long-range companion progress.",
  "play.collectionCompanionsTitle": "Companions",
  "play.collectionCompanionsDescription": "Your available fox variants.",
  "play.collectionHabitatsDescription": "Owned environments that can restyle the den.",
  "play.collectionAccessoriesDescription": "Owned items your fox can wear right now.",
  "play.rarity.common": "Common",
  "play.rarity.rare": "Rare",
  "play.rarity.epic": "Epic",
  "play.inventoryDescription": "Everything your fox already owns and can show off.",
  "play.inventoryHabitatsTitle": "Habitat scenes",
  "play.inventoryHabitatsDescription": "Collected environment overrides for your den.",
  "play.inventoryAccessoriesTitle": "Wearables and trinkets",
  "play.inventoryAccessoriesDescription": "Everything your fox can wear or carry into the scene.",
  "play.companionSpotlightTitle": "Companion spotlight",
  "play.companionSpotlightDescription": "A closer look at the fox currently leading your den.",
  "play.companionSpotlightBestFor": "Best for",
  "play.companionSpotlightHint": "Tap a companion in the store to preview their vibe here.",
  "play.habitatTitle": "Habitat scene",
  "play.habitatDescription": "A tiny diorama for the companion currently holding the spotlight.",
  "play.habitatNowShowing": "Now showing",
  "play.habitatModeDefault": "Default habitat",
  "play.habitatModeEquipped": "Scene override",
  "play.habitatModePreview": "Preview override",
  "play.slot.headwear": "Headwear",
  "play.slot.eyewear": "Eyewear",
  "play.slot.neckwear": "Neckwear",
  "play.slot.charm": "Charm",
  "play.slot.environment": "Environment",
  "play.slot.companion": "Companion",
  "play.buy": "Buy",
  "play.equip": "Equip",
  "play.unequip": "Unequip",
  "play.owned": "Owned",
  "play.available": "Available",
  "play.preview": "Preview",
  "play.previewing": "Previewing",
  "play.previewPanelTitle": "Preview",
  "play.previewPanelDescription":
    "The current shared preview updates from shop and collection selections.",
  "play.previewPanelBadge": "Current preview",
  "play.locked": "Locked",
  "play.openSection": "Open section",
  "play.heroEyebrow": "Current den",
  "play.heroSceneBadge": "Current setup",
  "play.heroAccessoriesEmpty": "No accessories equipped",
  "play.heroAccessoriesCount": ({ count }) => `${count} accessories equipped`,
  "play.overviewFeaturedTitle": "Featured rewards",
  "play.overviewFeaturedDescription": "A tighter shelf of standout picks worth previewing next.",
  "play.overviewRecommendedMissionsTitle": "Recommended missions",
  "play.overviewRecommendedMissionsDescription":
    "Start with the most claimable or highest-momentum goals right now.",
  "play.overviewDescription":
    "Your den at a glance, with quick paths into shopping, collection, missions, and achievements.",
  "play.overviewEquippedCompanion": "Equipped right now",
  "play.overviewEquippedEnvironment": "Current den scene",
  "play.overviewAccessoriesTitle": "Accessories",
  "play.overviewAccessoriesSupport": "Worn right now",
  "play.overviewShopMeta": ({ count }) => `${count} store rewards ready to browse`,
  "play.overviewCollectionMeta": ({ count }) => `${count} owned rewards in your collection`,
  "play.overviewMissionMeta": ({ daily, weekly }) =>
    `${daily} daily and ${weekly} weekly missions available`,
  "play.overviewAchievementMeta": ({ count }) => `${count} long-range milestones tracked`,
  "play.unlockHint.recoveryDay":
    "Take a true day off or log a light recovery day to unlock this den reward.",
  "play.unlockHint.nonWorkday": "Take a non-workday to unlock this den reward.",
  "play.unlockHint.default": "Keep progressing to unlock this den reward.",
  "play.themeTag.focus": "Focus",
  "play.themeTag.craft": "Craft",
  "play.themeTag.recovery": "Recovery",
  "play.shopNav": "Shop",
  "play.collectionNav": "Collection",
  "play.missionsNav": "Missions",
  "play.achievementsNav": "Achievements",
  "play.emptyInventory": "No goodies yet",
  "play.emptyInventoryDescription":
    "Claim rewards or buy something from the den store to start your collection.",
  "play.toastPurchaseTitle": "Purchase complete",
  "play.toastPurchaseDescription": ({ title }) => `${title} joined your collection.`,
  "play.toastPurchaseFailedTitle": "Could not complete purchase",
  "play.toastEquipTitle": "Companion updated",
  "play.toastEquipDescription": ({ title }) => `${title} is now on your fox.`,
  "play.toastEquipFailedTitle": "Could not equip item",
  "play.toastUnequipTitle": "Accessory removed",
  "play.toastUnequipDescription": ({ title }) => `${title} is back in storage for now.`,
  "play.toastUnequipFailedTitle": "Could not unequip item",
  "play.moodLabel": "Companion mood",
  "play.moodSupportCalm": "A steady pace keeps the den peaceful.",
  "play.moodSupportCurious": "Your fox is watching for the next small spark.",
  "play.moodSupportFocused": "The current rhythm says it is time to lock in.",
  "play.moodSupportHappy": "Clean progress is putting the whole den in a good mood.",
  "play.moodSupportExcited": "Momentum is high and your fox can feel it.",
  "play.moodSupportCozy": "A true day off lets the den stay warm and unhurried.",
  "play.moodSupportPlayful": "Light progress on a day off keeps the energy fun.",
  "play.moodSupportTired": "The streak is alive, but your fox would welcome a gentler pace.",
  "play.moodSupportDrained": "You pushed hard. The den is asking for recovery next.",
  "play.companionVariant.aurora.title": "Aurora fox",
  "play.companionVariant.aurora.personality":
    "Bright, steady, and quietly encouraging. Aurora fits the default Timely energy: warm momentum without drama.",
  "play.companionVariant.aurora.bestFor":
    "Balanced days, clean streaks, and a den that feels upbeat without getting noisy.",
  "play.companionVariant.arctic.title": "Arctic fox",
  "play.companionVariant.arctic.personality":
    "Cool-headed and precise. Arctic makes the whole desk feel sharper when you want calm focus and less emotional clutter.",
  "play.companionVariant.arctic.bestFor":
    "Deep-focus sessions, tidy routines, and weeks where consistency matters more than hype.",
  "play.companionVariant.kitsune.title": "Kitsune fox",
  "play.companionVariant.kitsune.personality":
    "Mischievous, luminous, and a little theatrical. Kitsune turns even small progress into something that feels alive.",
  "play.companionVariant.kitsune.bestFor":
    "Creative sprints, playful recovery days, and users who want the den to feel magical.",
  "play.habitat.aurora.title": "Forest glade",
  "play.habitat.aurora.description":
    "Soft grass, warm light, and an easy rhythm. Aurora feels most at home where steady progress still has room to breathe.",
  "play.habitat.arctic.title": "Snow field",
  "play.habitat.arctic.description":
    "A bright, quiet expanse with crisp air and clean edges. Arctic belongs in a scene that feels focused from corner to corner.",
  "play.habitat.kitsune.title": "Twilight grove",
  "play.habitat.kitsune.description":
    "A glowing grove full of dusk colors and trickster energy. Kitsune turns the den into something a little stranger and more alive.",
  "play.habitat.starlitCamp.title": "Starlit camp",
  "play.habitat.starlitCamp.description":
    "A shared night camp with lantern warmth, ember light, and a calmer sky overhead. It turns any companion's corner into a late-shift hideout.",
  "play.habitat.sunlitStudio.title": "Sunlit studio",
  "play.habitat.sunlitStudio.description":
    "A bright clay studio with soft daylight, tidy shelves, and a desk made for careful making. It gives the whole den a crafted, daytime warmth.",
  "play.habitat.rainyRetreat.title": "Rainy retreat",
  "play.habitat.rainyRetreat.description":
    "A quiet nook with rainy windows, soft cushions, and the kind of hush that makes recovery feel earned. It turns the den into a shelter for slower days.",
  "play.habitat.propLantern": "Lantern",
  "play.habitat.propDesk": "Desk",
  "play.habitat.propSnowDrift": "Snow drift",
  "play.habitat.propGlowRing": "Glow ring",
  "play.habitat.propWindow": "Window",
  "play.habitat.propCushion": "Cushion",
  "play.reward.aurora-evolution.name": "Aurora Evolution",
  "play.reward.aurora-evolution.description":
    "A sharper arctic companion variant for deep-focus den sessions.",
  "play.reward.kitsune-lumen.name": "Kitsune Lumen",
  "play.reward.kitsune-lumen.description":
    "A luminous fox companion that makes the whole den feel more magical.",
  "play.reward.starlit-camp.name": "Starlit Camp",
  "play.reward.starlit-camp.description":
    "A lantern-lit night camp that turns the den into a calmer late-shift hideout.",
  "play.reward.sunlit-studio.name": "Sunlit Studio",
  "play.reward.sunlit-studio.description":
    "A bright clay workshop scene made for careful making and daytime warmth.",
  "play.reward.rainy-retreat.name": "Rainy Retreat",
  "play.reward.rainy-retreat.description":
    "A soft recovery nook with rainy windows, cushions, and a slower rhythm.",
  "play.reward.frame-signal.name": "Signal Frame",
  "play.reward.frame-signal.description":
    "A sharp eyewear frame that gives your fox a clean desk-side signal look.",
  "play.reward.desk-constellation.name": "Desk Constellation",
  "play.reward.desk-constellation.description":
    "A small clay desk charm that adds a little orbiting wonder to the den.",
  "play.reward.restful-tea-set.name": "Restful Tea Set",
  "play.reward.restful-tea-set.description":
    "A gentle recovery charm that makes slower days feel deliberate.",
  "play.reward.weekend-pennant.name": "Weekend Pennant",
  "play.reward.weekend-pennant.description":
    "A celebratory banner for true off-days and light weekend energy.",
  "play.reward.aurora-scarf.name": "Aurora Scarf",
  "play.reward.aurora-scarf.description":
    "A bright scarf that keeps your fox cozy without losing momentum.",
  "play.reward.comet-cap.name": "Comet Cap",
  "play.reward.comet-cap.description": "A compact cap for lighter, playful den styling.",
  "play.quest.balanced_day.title": "Balanced day",
  "play.quest.balanced_day.description":
    "Meet your target cleanly today without spilling into overage.",
  "play.quest.balanced_day.rewardLabel": "50 tokens",
  "play.quest.clean_week.title": "Clean week",
  "play.quest.clean_week.description": "Build a calendar week with no under-target workdays.",
  "play.quest.clean_week.rewardLabel": "75 tokens",
  "play.quest.issue_sprinter.title": "Issue sprinter",
  "play.quest.issue_sprinter.description":
    "Move through distinct work items quickly during the current calendar week.",
  "play.quest.issue_sprinter.rewardLabel": "45 tokens",
  "play.quest.recovery_window.title": "Recovery window",
  "play.quest.recovery_window.description":
    "Take truly light recovery time within the current calendar week.",
  "play.quest.recovery_window.rewardLabel": "40 tokens",
  "play.quest.weekend_wander.title": "Weekend wander",
  "play.quest.weekend_wander.description":
    "Log a gentle non-workday during the current calendar week.",
  "play.quest.weekend_wander.rewardLabel": "35 tokens",
  "play.quest.streak_keeper.title": "Streak keeper",
  "play.quest.streak_keeper.description": "Protect a seven-day streak without breaking the chain.",
  "play.quest.streak_keeper.rewardLabel": "Fox trail badge",
  "play.noActiveQuests": "No active quests",
  "play.noActiveQuestsDescription": "Sync your data to start missions.",
  "gamification.weeklyStreak": "Weekly streak",
  "gamification.activeMissions": "Active missions",
  "gamification.complete": "Complete!",
  "gamification.dailyMissions": "Daily missions",
  "gamification.weeklyMissions": "Weekly missions",
  "gamification.achievementLog": "Achievement log",
  "gamification.emptyDaily": "No daily missions yet",
  "gamification.emptyWeekly": "No weekly missions yet",
  "gamification.emptyAchievements": "No achievements yet",
  "gamification.emptyDailyDescription":
    "Sync a little more activity to unlock a fresh batch for today.",
  "gamification.emptyWeeklyDescription":
    "The weekly board will fill in as your work rhythm settles in.",
  "gamification.emptyAchievementsDescription":
    "Long-term milestones will appear here once your fox has bigger stories to tell.",
  "gamification.category.focus": "Focus",
  "gamification.category.consistency": "Consistency",
  "gamification.category.milestone": "Milestone",
  "gamification.activate": "Activate",
  "gamification.activeNow": "Active now",
  "gamification.activeCount": ({ count, limit }) => `${count}/${limit} active`,
  "gamification.toastQuestActivatedTitle": "Mission activated",
  "gamification.toastQuestActivatedDescription": ({ title }) =>
    `${title} is now pinned to your active board.`,
  "gamification.toastQuestActivationFailedTitle": "Could not activate mission",
  "gamification.claimReward": "Claim reward",
  "gamification.claimed": "Claimed",
  "gamification.toastRewardClaimedTitle": "Reward claimed",
  "gamification.toastRewardClaimedDescription": ({ title }) =>
    `${title} paid out and joined your haul.`,
  "gamification.toastAchievementUnlockedTitle": "Achievement unlocked",
  "gamification.toastQuestClaimFailedTitle": "Could not claim reward",
  "audit.title": "Audit",
  "audit.note": "Underfills and overages.",
  "ui.close": "Close",
  "tray.focus": "Focus",
  "tray.loadingStatus": "Loading tray status...",
  "tray.dayRefreshFailed": ({ error }) => `Unable to refresh tray day: ${error}`,
  "tray.refreshFailedTitle": "Tray refresh failed",
  "tray.goalMet": "Target met",
  "tray.logged": ({ hours }) => `${hours} logged`,
  "tray.above": ({ hours }) => `${hours} above target`,
  "tray.left": ({ hours }) => `${hours} left`,
  "tray.syncFailed": "Sync failed",
  "tray.syncing": "Syncing",
  "week.target": ({ hours }) => `target ${hours}`,
} satisfies Record<string, MessageValue>;

type MessageKey = keyof typeof enMessages;
type MessageDictionary = Record<MessageKey, MessageValue>;

const esMessages: MessageDictionary = {
  ...enMessages,
  "common.auto": "Automático (Sistema)",
  "common.about": "Acerca de",
  "common.back": "Atrás",
  "common.continue": "Continuar",
  "common.day": "Día",
  "common.daysShort": "d",
  "common.days": ({ count }) => `${count} ${Number(count) === 1 ? "día" : "días"}`,
  "common.failed": "Error",
  "common.getStarted": "Comenzar",
  "common.hide": "Ocultar",
  "common.home": "Inicio",
  "common.issues": "Issues",
  "common.language": "Idioma",
  "common.loading": "Cargando",
  "common.loadingApp": "Cargando Timely",
  "common.never": "Nunca",
  "common.next": "Siguiente",
  "common.noFlags": "Sin alertas",
  "common.notSet": "Sin configurar",
  "common.open": "Abrir",
  "common.oauth": "OAuth",
  "common.period": "Período",
  "common.pickDay": "Elegir día",
  "common.pickPeriod": "Elegir período",
  "common.pickWeek": "Elegir semana",
  "common.quit": "Salir",
  "common.play": "Juego",
  "common.previous": "Anterior",
  "common.retry": "Reintentar",
  "common.saveAndContinue": "Guardar y continuar",
  "common.searchCountry": "Buscar país",
  "common.searchTimezone": "Buscar zona horaria",
  "common.search": "Buscar...",
  "common.settings": "Ajustes",
  "common.skipForNow": "Omitir por ahora",
  "common.sync": "Sincronizar",
  "common.syncNow": "Sincronizar ahora",
  "common.syncing": "Sincronizando...",
  "common.thisPeriod": "Este período",
  "common.thisWeek": "Esta semana",
  "common.today": "Hoy",
  "common.viewLog": "Ver registro",
  "common.week": "Semana",
  "common.worklog": "Registro",
  "common.year": "Año",
  "common.thisYear": "Este año",
  "common.noResults": "No se encontraron resultados.",
  "common.none": "Ninguno",
  "common.english": "Inglés",
  "common.spanish": "Español",
  "common.portuguese": "Portugués",
  "timeInput.hours": "Horas",
  "timeInput.minutes": "Minutos",
  "timeInput.period": "AM o PM",
  "common.status.empty": "vacío",
  "common.status.underTarget": "por debajo de la meta",
  "common.status.onTrack": "en ritmo",
  "common.status.metTarget": "meta cumplida",
  "common.status.overTarget": "por encima de la meta",
  "common.status.nonWorkday": "día no laborable",
  "common.severity.high": "alta",
  "common.severity.medium": "media",
  "common.severity.low": "baja",
  "sync.statusAria": ({ status }) => `Estado de sincronización: ${status}`,
  "sync.logTitle": "Registro de sincronización",
  "sync.logDescription": "Progreso en vivo de la sincronización y notas recientes de actividad.",
  "sync.done": "Listo",
  "sync.failed": "Falló",
  "sync.starting": "Iniciando sincronización...",
  "sync.noEntries": "Aún no hay entradas. Inicia una sincronización primero.",
  "sync.toastCompleteTitle": "Sincronización completa",
  "sync.toastCompleteDescription": ({ projects, entries, issues }) =>
    `${projects} proyectos, ${entries} entradas, ${issues} incidencias sincronizadas.`,
  "sync.toastFailedTitle": "La sincronización falló",
  "topBar.lastSynced": ({ value }) => `Última sincronización: ${value}`,
  "topBar.sync": "Sincronizar",
  "app.failedToLoad": "No se pudo cargar Timely",
  "app.loadingWorklog": "Cargando registro",
  "app.loadingPlayCenter": "Cargando centro de juego",
  "play.failedToLoadTitle": "No se pudo cargar el centro de juego",
  "play.failedToLoadDescription": "El centro de juego no está disponible ahora mismo.",
  "app.loadingSettings": "Cargando ajustes",
  "app.loadingSetup": "Cargando configuración",
  "app.loadingProviderSetup": "Cargando conexión del proveedor",
  "app.loadingScheduleSetup": "Cargando horario",
  "app.loadingSyncSetup": "Cargando sincronización",
  "app.loadingFinishScreen": "Cargando pantalla final",
  "home.finishSetup": "Termina de configurar tu espacio para desbloquear todas las funciones.",
  "home.continueSetup": "Continuar configuración",
  "home.heroToday": "Hoy",
  "home.heroRemaining": "Restante",
  "home.heroStreak": "Racha",
  "home.heroLoggedPill": ({ hours }) => `Registrado ${hours}`,
  "home.heroRemainingPill": ({ hours }) => `Faltan ${hours}`,
  "home.heroTargetDonePill": "Objetivo del día listo",
  "home.heroStreakPill": ({ streak }) => `Racha ${streak}`,
  "home.heroRestDayPill": ({ companion }) => `${companion} está de descanso`,
  "home.heroNoTargetPill": "Hoy no cuenta como meta",
  "home.heroStreakSafePill": ({ streak }) => `Racha a salvo ${streak}`,
  "home.ofTarget": ({ target }) => `de ${target} objetivo`,
  "home.stillToLog": "por registrar",
  "home.targetCleared": "objetivo cumplido",
  "home.momentumAlive": "el impulso sigue",
  "home.readyToStart": "listo para empezar",
  "home.heroLogged": "Registrado",
  "home.ctaToday": "Abrir registro de hoy",
  "home.ctaWeek": "Revisar esta semana",
  "home.ctaWeekNote": "Ver el ritmo por día",
  "home.ctaPeriod": "Inspeccionar rango",
  "home.ctaPeriodNote": "Mirar tendencias más amplias",
  "home.todayFocus": "Enfoque de hoy",
  "home.petPanelTitle": "Estado del compañero",
  "home.petMoodCalm": "Calmado",
  "home.petMoodCurious": "Curioso",
  "home.petMoodFocused": "Enfocado",
  "home.petMoodHappy": "Feliz",
  "home.petMoodExcited": "Animado",
  "home.petMoodCozy": "A gusto",
  "home.petMoodPlayful": "Juguetón",
  "home.petMoodTired": "Cansado",
  "home.petMoodDrained": "Sin batería",
  "home.petMetricStreak": "Racha",
  "home.petMetricFocus": "Foco",
  "home.petMetricRhythm": "Ritmo",
  "home.weeklyProgressTitle": "Progreso de esta semana",
  "home.weeklyProgressNote": "Horas registradas contra el objetivo de cada día laboral.",
  "home.weeklyOffLabel": "descanso",
  "home.streakPanelTitle": "Racha actual",
  "home.streakPanelNote": "Mantén la cadena viva y deja que la semana siga encendida.",
  "home.weeklyPulse": "Pulso semanal",
  "home.thisWeek": "Esta semana",
  "home.weeklyRhythmEmpty": "Sincroniza tus datos para ver aquí tu ritmo semanal.",
  "home.streakEmpty": "Sincroniza tus datos para ver aquí tu racha actual.",
  "home.headlineVictoryA": ({ alias }) => `Cerraste el día con fuerza, [[${alias}]].`,
  "home.headlineVictoryB": ({ alias }) => `Objetivo cumplido. Buen cierre, [[${alias}]].`,
  "home.headlineFocusA": ({ alias }) => `El día va tomando forma, [[${alias}]].`,
  "home.headlineFocusB": ({ alias }) => `Vas con buen ritmo, [[${alias}]]. El camino está claro.`,
  "home.headlineWeekendA": ({ alias }) => `Hoy toca un ritmo más suave, [[${alias}]].`,
  "home.headlineWeekendB": ({ alias }) => `Te viene bien un día más liviano, [[${alias}]].`,
  "home.headlineHolidayA": ({ alias }) => `Hoy pinta a feriado tranquilo, [[${alias}]].`,
  "home.headlineHolidayB": ({ alias }) => `Buen día para bajar un cambio, [[${alias}]].`,
  "home.headlineWarmupA": ({ alias }) => `Hay una página fresca esperando, [[${alias}]].`,
  "home.headlineWarmupB": ({ alias }) =>
    `El tablero está limpio, [[${alias}]]. Ya puedes marcar el ritmo.`,
  "home.insightTopIssueA": ({ companion, issueKey, hours }) =>
    `[[${companion}]] no deja de mirar [[${issueKey}]]. Ya van [[${hours}]] ahí, así que ese hilo está guiando tu día.`,
  "home.insightTopIssueB": ({ companion, issueKey, hours }) =>
    `Por ahora [[${issueKey}]] es tu centro de gravedad. [[${companion}]] ya ve [[${hours}]] acumuladas en ese frente.`,
  "home.insightTopIssueC": ({ companion, issueKey, hours }) =>
    `La señal más clara del día sale de [[${issueKey}]]. [[${companion}]] ya vio caer [[${hours}]] en esa misma línea.`,
  "home.insightWeekA": ({ companion, hours }) =>
    `[[${companion}]] ya vio [[${hours}]] registradas en la semana visible, así que incluso un día tranquilo sigue apoyado en un buen impulso.`,
  "home.insightWeekB": ({ companion, hours }) =>
    `La semana ya acumula [[${hours}]] de trabajo. [[${companion}]] lo lee como un ritmo que vale la pena cuidar.`,
  "home.insightWeekC": ({ companion, hours }) =>
    `Ya llevas [[${hours}]] en la semana. [[${companion}]] no ve un reinicio, ve el siguiente paso limpio.`,
  "home.insightNonWorkdayLoggedA": ({ companion, hours }) =>
    `[[${companion}]] vio ese avance liviano de [[${hours}]] hoy. Suma sin volver pesado el día.`,
  "home.insightNonWorkdayLoggedB": ({ companion, hours }) =>
    `Incluso en día libre, [[${companion}]] nota [[${hours}]] de movimiento suave. Sirve para mantener el hilo sin forzar nada.`,
  "home.insightNonWorkdayRestA": ({ companion, holiday }) =>
    holiday
      ? `[[${companion}]] se lo está tomando con calma por [[${holiday}]]. Hoy no toca perseguir barras ni metas.`
      : `[[${companion}]] está cuidando un día libre de verdad. No hay meta que perseguir, solo espacio para respirar.`,
  "home.insightNonWorkdayRestB": ({ companion, holiday }) =>
    holiday
      ? `[[${holiday}]] cambia el tono completo del día. [[${companion}]] prefiere verte recargando en vez de apurando el ritmo.`
      : `Hoy queda fuera del ritmo laboral normal. [[${companion}]] lo lee como descanso útil, no como tiempo perdido.`,
  "home.insightStartA": ({ companion }) =>
    `[[${companion}]] está en calma esperando el primer movimiento real. Apenas entre un issue, esta vista se convierte en tu mesa de mando.`,
  "home.insightStartB": ({ companion }) =>
    `Todavía no hay una señal fuerte, pero [[${companion}]] está listo. Un solo bloque registrado basta para despertar la pantalla.`,
  "home.insightStartC": ({ companion }) =>
    `[[${companion}]] está calentando antes del primer sprint. En cuanto registres el primer bloque, el día empieza a tomar forma aquí.`,
  "home.petCalmA": ({ companion, consistency }) =>
    `[[${companion}]] está calmado. Tu ritmo de [[${consistency}]] dice que todavía puedes construir impulso sin correr.`,
  "home.petCalmB": ({ companion, focus }) =>
    `[[${companion}]] sigue en modo calma. Un poco más de [[${focus}]] de trabajo enfocado ya cambiaría el tono del día.`,
  "home.petFocusedA": ({ companion, focus, streak }) =>
    `[[${companion}]] está totalmente enfocado. Con [[${focus}]] de foco y una racha de [[${streak}]], la próxima sesión puede empujar el día con limpieza.`,
  "home.petFocusedB": ({ companion, consistency }) =>
    `[[${companion}]] se ve concentrado y listo. Ese [[${consistency}]] de ritmo dice que tus hábitos se están sosteniendo.`,
  "home.petHappyA": ({ companion, streak, consistency }) =>
    `[[${companion}]] está feliz. Una racha de [[${streak}]] junto con [[${consistency}]] de consistencia hace que todo se sienta bajo control.`,
  "home.petHappyB": ({ companion, focus }) =>
    `[[${companion}]] está de buen humor. Las [[${focus}]] de tiempo enfocado de hoy ya son una base sólida.`,
  "home.petExcitedA": ({ companion, streak }) =>
    `[[${companion}]] está animado y quiere mantener viva la racha de [[${streak}]]. Este es el momento para aprovechar la energía.`,
  "home.petExcitedB": ({ companion, consistency }) =>
    `[[${companion}]] está vibrando. Un ritmo de [[${consistency}]] hace que toda la carrera se sienta viva.`,
  "home.petNonWorkdayRestA": ({ companion }) =>
    `[[${companion}]] anda relajado hoy. Un día libre bien llevado también le hace bien a toda la semana.`,
  "home.petNonWorkdayRestB": ({ companion, streak }) =>
    `[[${companion}]] está tranquilo y hecho bolita. Tu racha de [[${streak}]] sigue a salvo, así que hoy no hace falta empujar.`,
  "home.petNonWorkdayActiveA": ({ companion, hours }) =>
    `[[${companion}]] disfruta este tipo de avance liviano. [[${hours}]] en día libre se siente bien sin robarte descanso.`,
  "home.petNonWorkdayActiveB": ({ companion, hours }) =>
    `[[${companion}]] vio caer [[${hours}]] con suavidad hoy. Lo justo para mantenerte en marcha sin convertirlo en jornada completa.`,
  "worklog.weeklyBreakdown": "Desglose semanal",
  "worklog.weeklyBreakdownNote": ({ range }) =>
    `${range}. Elige un día para abrir su resumen completo.`,
  "worklog.weekSummary": "Resumen semanal",
  "worklog.periodSummary": "Resumen del período",
  "worklog.selectedRange": ({ range }) => `Rango seleccionado: ${range}`,
  "worklog.daySummary": "Resumen del día",
  "worklog.weekOf": ({ date }) => `Semana de ${date}`,
  "worklog.backTo": ({ parent }) => `Volver a ${parent}`,
  "worklog.auditFlags": "Alertas de auditoría",
  "worklog.auditFlagsDescription":
    "Revisa los elementos que podrían necesitar atención en este tramo seleccionado.",
  "worklog.noIssuesForDay": "No hay incidencias registradas para este día",
  "worklog.noIssuesForDayDescription": "Elige otra fecha o registra algo de tiempo.",
  "worklog.logged": "Registrado",
  "worklog.loggedNote": "Seguimiento del día seleccionado",
  "worklog.target": "Objetivo",
  "worklog.targetNote": "Carga prevista",
  "worklog.delta": "Diferencia",
  "worklog.deltaPositive": "En o por encima del objetivo",
  "worklog.deltaNegative": "Aún pendiente",
  "worklog.issuesCount": "Incidencias",
  "worklog.noAuditFlags": "Sin alertas de auditoría",
  "worklog.auditFlagCount": ({ count }) =>
    `${count} ${Number(count) === 1 ? "alerta" : "alertas"} de auditoría`,
  "worklog.noIssues": "No hay incidencias registradas para este día",
  "worklog.pickDifferentDate": "Elige otra fecha o registra algo de tiempo.",
  "worklog.targetLabel": ({ hours }) => `objetivo ${hours}`,
  "worklog.failedToLoadTitle": "No se pudo cargar el registro",
  "worklog.gitlabConnectionRequired":
    "Conecta GitLab en Ajustes para cargar tu registro de trabajo.",
  "dashboard.weekTitle": "Semana",
  "dashboard.weekNote": "Horas de la semana actual.",
  "dashboard.loggedTime": "Registrado",
  "dashboard.loggedAcrossRange": "En este rango",
  "dashboard.expectedHours": "Previsto",
  "dashboard.expectedThroughYesterday": "Hasta ayer",
  "dashboard.expectedThroughYesterdayNote": "Hasta ayer.",
  "dashboard.expectedForRange": "Total del rango",
  "dashboard.expectedForRangeNote": "Hasta el fin seleccionado.",
  "dashboard.missingHours": "Faltan",
  "dashboard.missingHoursNote": "Lo que aún falta para llegar al plan.",
  "dashboard.targetTime": "Objetivo",
  "dashboard.expectedLoad": "Previstas para este rango",
  "dashboard.cleanDays": "Días dentro del objetivo",
  "dashboard.overflowCount": ({ count }) =>
    `${count} ${Number(count) === 1 ? "día" : "días"} con exceso`,
  "dashboard.dailyBreakdown": "Desglose diario",
  "dashboard.pickDayToOpen": "Elige un día para abrir su resumen completo.",
  "settings.connection": "Conexión",
  "settings.providerSync": "Sincronización del proveedor",
  "settings.connectedTo": ({ host }) => `Conectado a ${host}`,
  "settings.notConnected": "Sin conectar",
  "settings.schedule": "Horario",
  "settings.schedulePreferences": "Preferencias del horario",
  "settings.schedulePreferencesHint":
    "La zona horaria, el primer día de la semana y el formato de duración se combinan con tu horario semanal de arriba.",
  "settings.calendarAndHolidays": "Calendario y festivos",
  "settings.appearance": "Apariencia",
  "settings.accessibility": "Accesibilidad",
  "settings.theme": "Tema",
  "settings.motionPreference": "Movimiento",
  "settings.motionPreferenceDescription":
    "Controla las animaciones decorativas en Timely. Sistema sigue la preferencia de accesibilidad del sistema operativo.",
  "settings.motionSystem": "Sistema",
  "settings.motionReduced": "Reducido",
  "settings.motionFull": "Completo",
  "settings.motionSummary": ({ mode }) => `Movimiento: ${mode}`,
  "settings.timeFormat": "Formato de tiempo",
  "settings.hoursAndMinutes": "Horas y minutos",
  "settings.decimal": "Decimal",
  "settings.durationHint": "Controla cómo se muestran las duraciones en toda la app.",
  "settings.hoursPerDaySummary": ({ hours }) => `${hours}h/día`,
  "settings.sync": "Sincronización",
  "settings.dataManagement": "Gestión de datos",
  "settings.resetDataDescription":
    "Restablece todos los datos locales, incluidas conexiones, registros y ajustes.",
  "settings.resetAllData": "Restablecer datos",
  "settings.shiftStart": "Inicio de jornada",
  "settings.shiftEnd": "Fin de jornada",
  "settings.lunchBreak": "Pausa de almuerzo",
  "settings.netHoursPerDay": "Horas netas/día",
  "settings.netHoursShort": "Netas",
  "settings.scheduleByDay": "Horario por día",
  "settings.weeklySchedule": "Horario semanal",
  "settings.weeklyScheduleDescription":
    "Define las horas normales de cada día de tu semana laboral.",
  "settings.workingDay": "Día laborable",
  "settings.workingHours": "Horario laboral",
  "settings.dayOff": "Día libre",
  "settings.workWeek": "Semana laboral",
  "settings.previewWeekLabel": ({ range }) => `Semana de vista previa: ${range}`,
  "settings.quickPresets": "Ajustes rápidos",
  "settings.standardWorkweek": "Semana laboral estándar",
  "settings.shortFridayPreset": "Viernes corto",
  "settings.customPreset": "Personalizado",
  "settings.applyToMatchingDays": "Aplicar a los días iguales",
  "settings.applyToSelectedDays": "Aplicar a los días elegidos",
  "settings.applyToWholeWeek": "Aplicar a toda la semana",
  "settings.wholeWeekLabel": "Los 7 días",
  "settings.hours": "Horas",
  "settings.holidayShort": "Festivo",
  "settings.copyToDays": "Copiar a...",
  "settings.copyDayScheduleTitle": ({ day }) => `Copiar horario de ${day}`,
  "settings.copyDayScheduleHint": "Elige los días que deben usar este horario.",
  "settings.copyDayScheduleEmpty": "Elige al menos un día.",
  "settings.copyDayScheduleApply": "Aplicar",
  "settings.setupDayOffHint": "Este día queda fuera de tu objetivo semanal hasta que lo actives.",
  "settings.timezone": "Zona horaria",
  "settings.firstDayOfWeek": "Primer día de la semana",
  "settings.workdays": "Días laborables",
  "settings.syncNow": "Sincronizar ahora",
  "settings.lastSyncEntries": ({ count }) =>
    `Última sincronización: ${count} entradas sincronizadas`,
  "settings.pullLatest": "Trae los últimos datos desde GitLab",
  "settings.autoSync": "Auto-sincronización",
  "settings.autoSyncDescription": "Trae datos de GitLab automáticamente en segundo plano",
  "settings.syncInterval": "Intervalo de sincronización",
  "settings.intervalMinutes": ({ count }) => `${count} min`,
  "settings.intervalHours": ({ count }) => `${count} ${Number(count) === 1 ? "hora" : "horas"}`,
  "settings.manualOnly": "Solo manual",
  "settings.everyInterval": ({ interval }) => `Cada ${interval}`,
  "settings.windowBehavior": "Ventana y bandeja",
  "settings.showTrayIcon": "Mostrar icono en la bandeja",
  "settings.showTrayIconDescription":
    "Mantén Timely disponible en la bandeja del sistema mientras sigue ejecutándose en segundo plano.",
  "settings.closeButtonAction": "Al cerrar la ventana",
  "settings.closeButtonActionDescription":
    "El botón de cerrar minimiza Timely a la bandeja en lugar de salir.",
  "settings.closeActionMinimizeToTray": "Minimizar a la bandeja",
  "settings.closeActionQuit": "Salir de la app",
  "settings.traySummaryCloseToTray": "Bandeja activada · al cerrar se minimiza a la bandeja",
  "settings.traySummaryKeepTray": "Bandeja activada · al cerrar se cierra la app",
  "settings.traySummaryDisabled": "Bandeja desactivada · al cerrar se cierra la app",
  "settings.remindersSection": "Recordatorios",
  "settings.remindersSummaryOff": "Recordatorios desactivados",
  "settings.remindersSummaryOn": ({ list }) => `Activos · ${list}`,
  "settings.remindersNoTimes": "sin horarios elegidos",
  "settings.remindersMaster": "Recordatorios de fin de jornada",
  "settings.remindersMasterDescription":
    "Avisos breves del sistema antes de terminar la jornada para cerrar el registro de trabajo.",
  "settings.remindersBeforeShiftEnd": "Minutos antes del fin de la jornada",
  "settings.remindersMinutesLabel": ({ minutes }) => `${minutes} minutos`,
  "settings.remindersPermission": "Permiso de avisos del sistema",
  "settings.remindersPermissionUnknown":
    "Estado desconocido — si no aparece nada, revisa Timely en los ajustes de privacidad del sistema.",
  "settings.remindersPermissionGranted": "Permitido — Timely puede mostrar avisos.",
  "settings.remindersPermissionDenied": "Bloqueado — activa Timely en los avisos del sistema.",
  "settings.remindersPermissionPrompt":
    "Aún sin decidir — el sistema puede preguntar la próxima vez.",
  "settings.remindersRequestPermission": "Preguntar al sistema",
  "settings.remindersPermissionRequestFailed": "No se pudo pedir el permiso de avisos",
  "settings.remindersTest": "Enviar aviso de comprobación",
  "settings.remindersTestDescription": "Muestra un aviso de ejemplo con la configuración actual.",
  "settings.remindersTestTitle": "Comprobación de Timely",
  "settings.remindersTestBody": "Si ves esto, los avisos de jornada funcionan.",
  "settings.remindersTestSent": "Aviso de comprobación enviado",
  "settings.remindersTestFailed": "No se pudo enviar el aviso de comprobación",
  "settings.diagnosticsSection": "Diagnóstico",
  "settings.diagnosticsSummary": ({ count }) => `${count} entradas`,
  "settings.remindersPermissionHintInteractive":
    "Este botón puede abrir una ventana de permiso del sistema en esta plataforma.",
  "settings.remindersPermissionHintSystemSettings":
    "En esta plataforma normalmente debes cambiarlo en los avisos del sistema.",
  "settings.remindersPermissionNoSystemPrompt": "No apareció una ventana del sistema",
  "settings.remindersPermissionNoChangeInteractive":
    "El estado no cambió. Si no viste la ventana, revisa los avisos del sistema para Timely.",
  "settings.remindersPermissionNoChangeSystemSettings":
    "Aquí no suele haber ventana en tiempo real. Abre los avisos del sistema para Timely.",
  "settings.remindersOpenSystemSettings": "Abrir ajustes del sistema",
  "settings.remindersOpenSystemSettingsSuccess": "Se abrieron los avisos del sistema",
  "settings.remindersOpenSystemSettingsFailed": "No se pudieron abrir los avisos del sistema",
  "settings.remindersPermissionDeniedCannotSend":
    "Timely está bloqueado en los avisos del sistema. Actívalo y vuelve a intentarlo.",
  "settings.remindersDiagnosticsTitle": "Consola de diagnóstico",
  "settings.remindersDiagnosticsDescription":
    "Usa esta consola cuando fallen los recordatorios. Puedes actualizar, limpiar, copiar o exportar las entradas recientes.",
  "settings.remindersDiagnosticsCount": ({ count }) => `${count} entradas`,
  "settings.diagnosticsFeatureFilter": "Función",
  "settings.diagnosticsFeatureFilterAll": "Todo",
  "settings.diagnosticsFeatureFilterNotifications": "Avisos",
  "settings.remindersDiagnosticsRefresh": "Actualizar",
  "settings.remindersDiagnosticsClear": "Limpiar registros",
  "settings.remindersDiagnosticsCopy": "Copiar informe",
  "settings.remindersDiagnosticsExport": "Exportar informe",
  "settings.remindersDiagnosticsLoading": "Cargando diagnóstico...",
  "settings.remindersDiagnosticsEmpty": "Todavía no hay entradas de diagnóstico.",
  "settings.remindersDiagnosticsCleared": "Registros de diagnóstico limpiados",
  "settings.remindersDiagnosticsClearFailed": "No se pudieron limpiar los registros de diagnóstico",
  "settings.remindersDiagnosticsCopied": "Informe de diagnóstico copiado",
  "settings.remindersDiagnosticsCopyFailed": "No se pudo copiar el informe de diagnóstico",
  "settings.remindersDiagnosticsExported": "Informe de diagnóstico exportado",
  "settings.remindersDiagnosticsExportFailed": "No se pudo exportar el informe de diagnóstico",
  "settings.saveSchedule": "Guardar horario",
  "settings.savingSchedule": "Guardando cambios...",
  "settings.scheduleSaved": "Horario guardado",
  "settings.scheduleSaveToastSuccessTitle": "Horario actualizado",
  "settings.scheduleSaveToastSuccessDescription":
    "Se guardaron tus horas semanales, la zona horaria y el primer día de la semana. El registro de trabajo y los objetivos diarios ya usan los valores nuevos.",
  "settings.scheduleSaveToastErrorTitle": "No se pudo guardar el horario",
  "settings.scheduleSaveToastErrorFallback": "Algo falló al guardar. Vuelve a intentarlo.",
  "settings.updates": "Actualizaciones",
  "settings.updatesOverviewTitle": "Detalles de la build",
  "settings.updatesInstalledVersion": "Versión instalada",
  "settings.updatesInstalledVersionHint": "Versión instalada actualmente en este equipo.",
  "settings.updatesReleaseChannel": "Canal de la build",
  "settings.updatesReleaseChannelHint": "Canal con el que se generó esta build de escritorio.",
  "settings.updatesDescription":
    "Consulta la última release del canal elegido e instálala cuando esté lista.",
  "settings.updatesIdleDescription":
    "Elige un canal y busca la release más reciente disponible para esta app.",
  "settings.updatesToastChecking": "Buscando una release más nueva para el canal seleccionado.",
  "settings.updatesToastInstalling": "Descargando y preparando la actualización seleccionada.",
  "settings.updatesToastRestarting": "Reiniciando Timely para terminar la actualización.",
  "settings.updatesChannel": "Canal de actualizaciones",
  "settings.updatesChannelStable": "Estable",
  "settings.updatesChannelUnstable": "Inestable",
  "settings.updatesChannelHint":
    "Estable recibe releases de producción. Inestable recibe prereleases primero.",
  "settings.updatesBuildChannelStable": "Build estable",
  "settings.updatesBuildChannelUnstable": "Build inestable",
  "settings.updatesSummary": ({ channel }) => `Siguiendo ${channel}`,
  "settings.updatesAvailableShort": ({ version }) => `Actualización ${version} disponible`,
  "settings.updatesReadyShort": "Lista para reiniciar",
  "settings.updatesReady": ({ version }) => `La actualización ${version} está lista`,
  "settings.updatesAvailable": ({ version }) => `Actualización ${version} disponible`,
  "settings.updatesReadyDescription":
    "La actualización ya se instaló. Reinicia Timely para terminar de aplicarla.",
  "settings.updatesAvailableDescription":
    "Hay una versión más nueva disponible para el canal seleccionado.",
  "settings.updatesPublishedOn": ({ date }) => `Publicada el ${date}`,
  "settings.updatesReleaseNotes": "Notas de la versión",
  "settings.updatesDownloadProgress": ({ progress }) => `Descargando ${progress}`,
  "settings.updatesUnknownProgress": "Descargando actualización...",
  "settings.updatesUpToDate": "Todo está al día",
  "settings.updatesNoUpdate": "No hay una versión más nueva para este canal por ahora.",
  "settings.updatesCheckFailed": "No se pudieron buscar actualizaciones",
  "settings.updatesInstallFailed": "No se pudo instalar la actualización",
  "settings.updatesChecking": "Buscando...",
  "settings.updatesCheck": "Buscar actualizaciones",
  "settings.updatesInstall": "Instalar actualización",
  "settings.updatesInstalling": "Instalando...",
  "settings.updatesRestart": "Reiniciar para actualizar",
  "settings.updatesRestartFailed": "No se pudo reiniciar para terminar la actualización",
  "settings.updatesChannelSaveFailed": "No se pudo guardar el canal de actualizaciones",
  "settings.aboutSectionTitle": "Acerca de",
  "settings.aboutSectionDescription":
    "Consulta la versión instalada y el canal de esta compilación.",
  "settings.viewAppDetails": "Ver detalles de la app",
  "settings.themeSummary": ({ theme }) => `Tema: ${theme}`,
  "settings.failedHolidayPreferences": "No se pudieron guardar los festivos",
  "settings.failedSchedule": "No se pudo guardar el horario",
  "settings.tryAgain": "Vuelve a intentarlo.",
  "settings.system": "Sistema",
  "settings.light": "Claro",
  "settings.dark": "Oscuro",
  "settings.languageSummary": ({ language }) => `Idioma: ${language}`,
  "settings.accessibilitySummary": ({ language }) => `Idioma: ${language}`,
  "settings.holidaySource": "Origen de festivos",
  "settings.detected": "Detectado",
  "settings.useDetected": "Usar detectado",
  "settings.holidays": "Festivos",
  "settings.noCountry": "Sin país",
  "settings.noHolidaysForYear": ({ year }) => `No hay festivos disponibles para ${year}.`,
  "settings.couldNotLoadHolidays": "No se pudieron cargar los festivos.",
  "providers.connectGitLab": "Conectar GitLab",
  "providers.linkGitLab": "Vincula tu cuenta de GitLab para empezar a registrar tiempo.",
  "providers.accessToken": "Token de acceso",
  "providers.quick": "rápido",
  "providers.gitLabHost": "Host de GitLab",
  "providers.personalAccessToken": "Token de acceso personal",
  "providers.needToken": "¿Necesitas un token?",
  "providers.createOneOn": ({ host }) => `Crea uno en ${host}`,
  "providers.withReadApiScope": "con el alcance read_api.",
  "providers.connectWithToken": "Conectar con token",
  "providers.oauthAppId": "ID de aplicación OAuth",
  "providers.createOAuthApp": "Crear una app OAuth",
  "providers.oauthScopes":
    "con los scopes read_api y read_user. Configura la URI de redirección como timely://auth/gitlab",
  "providers.waitingForAuthorization": "Esperando la autorización de GitLab...",
  "providers.completeSignIn":
    "Completa el inicio de sesión en la ventana de autenticación. La app detectará el callback automáticamente.",
  "providers.pasteCallbackManually": "¿Falló el callback? Pégalo manualmente",
  "providers.connectWithGitLab": "Conectar con GitLab",
  "providers.validatingToken": "Validando token...",
  "providers.authenticatedAs": ({ username, name }) => `Autenticado como @${username} (${name})`,
  "providers.connectedToHost": ({ host }) => `Conectado a ${host}`,
  "providers.disconnect": "Desconectar",
  "providers.gitLabLinked": "GitLab vinculado",
  "providers.oauthComplete": "La autenticación OAuth se completó.",
  "providers.oauthFailed": "OAuth falló",
  "providers.oauthCallbackFailed": ({ error }) => `El callback de OAuth falló: ${error}`,
  "providers.hostAndClientRequired": "El host y el Client ID son obligatorios para OAuth.",
  "providers.connectionFailed": "La conexión falló",
  "providers.hostAndTokenRequired": "El host y el token personal son obligatorios.",
  "providers.connectedToGitLab": "Conectado a GitLab",
  "providers.tokenSavedFor": ({ host }) => `Token guardado para ${host}`,
  "providers.tokenValidated": "Token validado",
  "providers.authenticatedUser": ({ username }) => `Autenticado como @${username}`,
  "providers.tokenValidationFailed": "La validación del token falló",
  "providers.manualCallbackPrompt": "Pega la URL de callback de tu navegador:",
  "providers.manualCallbackResolved": "El callback OAuth se resolvió manualmente.",
  "providers.callbackValidationFailed": ({ error }) => `La validación del callback falló: ${error}`,
  "providers.oauthPkceFallback": "OAuth PKCE + respaldo PAT",
  "providers.oauthPkce": "OAuth PKCE",
  "about.title": "Acerca de Timely",
  "about.subtitle": "Información de esta app de escritorio.",
  "about.versionLabel": "Versión",
  "about.desktopBuild": "Compilación de escritorio",
  "about.prereleaseTitle": "Canal preliminar",
  "about.prereleaseDescription": ({ label }) => `Estás usando la versión preliminar ${label}.`,
  "releaseHighlights.dialogTitle": "Novedades de Timely",
  "releaseHighlights.dialogDescription": ({ version }) =>
    `Revisa los puntos destacados de Timely ${version}.`,
  "releaseHighlights.gotIt": "Entendido",
  "onboarding.welcomeDescription":
    "Tu panel personal de seguimiento del tiempo que se sincroniza con GitLab. Hagamos un recorrido rápido para que veas cómo funciona todo.",
  "onboarding.progressDescription":
    "El anillo de progreso muestra qué tan cerca estás de tu objetivo diario. Se llena a medida que registras más tiempo durante el día.",
  "onboarding.issuesDescription":
    "Mira exactamente en qué issues pasaste tiempo hoy, ordenadas por horas. Cada entrada se conecta con una issue de GitLab de tus proyectos sincronizados.",
  "onboarding.weekDescription":
    "Un desglose visual de tu semana que muestra las horas registradas por día frente a tu objetivo. Detecta tendencias y mantén la constancia.",
  "onboarding.worklogDescription":
    "Profundiza en tus registros de tiempo. Cambia entre vistas para inspeccionar worklogs diarios, semanales o mensuales y alertas de auditoría.",
  "onboarding.settingsDescription":
    "Ve aquí para conectar tu cuenta de GitLab usando un token personal u OAuth. Una vez conectado, pulsa Sincronizar para traer tus horas reales.",
  "onboarding.doneDescription":
    "¡Ese fue el recorrido! Conecta tu cuenta de GitLab en Ajustes para empezar a seguir tus horas reales. ¡Feliz seguimiento!",
  "setup.welcomeTitle": "Bienvenido a Timely",
  "setup.welcomeDescription": "Tu compañero personal de worklog. Configuremos tu espacio.",
  "setup.scheduleTitle": "¿Cuándo trabajas?",
  "setup.scheduleDescription": "Define tu horario y tus días laborables",
  "setup.providerTitle": "Conectar GitLab",
  "setup.providerDescription": "Vincula tu cuenta para empezar a registrar tiempo",
  "setup.syncTitle": "Sincroniza tus datos",
  "setup.syncDescriptionConnected": "Trayendo tus worklogs desde GitLab",
  "setup.syncDescriptionDisconnected": "Podrás sincronizar más tarde desde Ajustes",
  "setup.noProviderYet":
    "Todavía no hay proveedor conectado. Puedes sincronizar después de la configuración.",
  "setup.syncComplete": "Sincronización completa",
  "setup.doneTitle": "¡Todo listo!",
  "setup.doneDescription": "Tu espacio está listo. Es hora de empezar a registrar.",
  "setup.finishing": "Terminando configuracion...",
  "setup.openTimely": "Abrir Timely",
  "setup.continueButton": "Continuar",
  "setup.connectionGuideTitle": "Termina de conectar GitLab",
  "setup.connectionGuideIntro":
    "Saltaste el asistente, así que vamos a terminar la configuración restante aquí en Ajustes conectando GitLab con un Personal Access Token u OAuth.",
  "setup.connectionGuideConnectionSection":
    "En esta sección Timely se conecta con GitLab. Elige la vía que te resulte más simple, conéctate y luego sincroniza tus datos.",
  "setup.connectionGuidePat":
    "Access Token es la opción más rápida. Este enlace abre en tu navegador la página de tokens de GitLab para crear uno con alcance read_api y pegarlo aquí.",
  "setup.connectionGuideOauthTab":
    "OAuth es la opción basada en navegador. Úsala si prefieres autorizar con una app de GitLab en lugar de crear un token manualmente.",
  "setup.connectionGuideOauthLink":
    "Esto abre en tu navegador la página de Applications de GitLab. Crea una app, configura la redirect URI como timely://auth/gitlab y luego copia aquí el Application ID.",
  "setup.connectionGuideSync":
    "Después de conectarte con cualquiera de los dos métodos, pulsa Sync en la barra superior para traer tus worklogs de GitLab a Timely.",
  "play.feeling": ({ mood }) => `Ánimo: ${mood}`,
  "play.level": "Nivel",
  "play.xp": "XP",
  "play.streak": "Racha",
  "play.tokens": "Fichas",
  "play.storeTitle": "Tienda de la guarida",
  "play.inventoryTitle": "Colección",
  "play.storeDescription": "Gasta fichas en cositas clay para tu compañero y su guarida.",
  "play.storeFeatured": "Selección destacada",
  "play.storeCompanions": "Línea de compañeros",
  "play.storeAccessories": "Estante de accesorios",
  "play.storeFeaturedDescription": "Premios con más presencia y un poco más de brillo.",
  "play.storeCompanionsDescription": "Desbloqueos grandes para tu zorro y su identidad.",
  "play.storeAccessoriesDescription": "Piezas del día a día y tesoros clay pequeños.",
  "play.storeBrowseTitle": "Explora la tienda de la guarida",
  "play.storeBrowseDescription":
    "Elige una sección, filtra la estantería y prueba combinaciones antes de comprar.",
  "play.storeBrowseCount": ({ count }) => `${count} recompensas en esta vista`,
  "play.storeTabAll": "Todo",
  "play.storeTabFeatured": "Destacados",
  "play.storeTabCompanions": "Compañeros",
  "play.storeTabAccessories": "Accesorios",
  "play.storeSecondaryFilters": "Filtros de tienda",
  "play.filterAll": "Todo",
  "play.filterOwned": "Tuyos",
  "play.filterLocked": "Bloqueados",
  "play.filterHabitats": "Hábitats",
  "play.filterWearables": "Objetos para llevar",
  "play.filterRecovery": "Recuperación",
  "play.emptyStoreFilterTitle": "No hay nada en este estante todavía",
  "play.emptyStoreFilterDescription": "Prueba otra sección o filtro para ver más recompensas.",
  "play.clearPreview": "Limpiar vista previa",
  "play.pageLabel": ({ current, total }) => `Página ${current} de ${total}`,
  "play.shopRouteDescription": "Tarjetas visibles, vistas previas rápidas y compras directas.",
  "play.collectionRouteDescription":
    "Todo lo que tu zorro ya tiene, con acciones directas para equipar y previsualizar.",
  "play.missionsRouteDescription": "Sigue, activa y cobra tus metas diarias y semanales.",
  "play.achievementsRouteDescription": "Hitos desbloqueados y progreso de compañía a largo plazo.",
  "play.collectionCompanionsTitle": "Compañeros",
  "play.collectionCompanionsDescription": "Tus variantes de zorro disponibles.",
  "play.collectionHabitatsDescription": "Entornos que ya tienes y que pueden cambiar la guarida.",
  "play.collectionAccessoriesDescription": "Objetos tuyos que tu zorro puede llevar ahora mismo.",
  "play.rarity.common": "Común",
  "play.rarity.rare": "Raro",
  "play.rarity.epic": "Épico",
  "play.inventoryDescription": "Todo lo que tu zorro ya consiguió y puede lucir.",
  "play.inventoryHabitatsTitle": "Escenas del hábitat",
  "play.inventoryHabitatsDescription": "Entornos coleccionados para cambiar la guarida.",
  "play.inventoryAccessoriesTitle": "Accesorios y detalles",
  "play.inventoryAccessoriesDescription":
    "Todo lo que tu zorro puede llevar puesto o sumar a la escena.",
  "play.companionSpotlightTitle": "Compañero en foco",
  "play.companionSpotlightDescription":
    "Una mirada más cercana al zorro que ahora mismo lleva el ritmo de tu guarida.",
  "play.companionSpotlightBestFor": "Ideal para",
  "play.companionSpotlightHint": "Toca un compañero en la tienda para previsualizar su vibra aquí.",
  "play.habitatTitle": "Escena del hábitat",
  "play.habitatDescription":
    "Un pequeño diorama para el compañero que está llevando el foco ahora mismo.",
  "play.habitatNowShowing": "En escena",
  "play.habitatModeDefault": "Hábitat base",
  "play.habitatModeEquipped": "Escena equipada",
  "play.habitatModePreview": "Vista previa",
  "play.slot.headwear": "Cabeza",
  "play.slot.eyewear": "Mirada",
  "play.slot.neckwear": "Cuello",
  "play.slot.charm": "Amuleto",
  "play.slot.environment": "Entorno",
  "play.slot.companion": "Compañero",
  "play.buy": "Comprar",
  "play.equip": "Equipar",
  "play.unequip": "Quitar",
  "play.owned": "Ya es tuyo",
  "play.available": "Disponible",
  "play.preview": "Ver",
  "play.previewing": "En vista",
  "play.previewPanelTitle": "Vista previa",
  "play.previewPanelDescription":
    "La vista compartida se actualiza desde la tienda y la colección.",
  "play.previewPanelBadge": "Vista actual",
  "play.locked": "Bloqueado",
  "play.openSection": "Abrir sección",
  "play.heroEyebrow": "Guarida actual",
  "play.heroSceneBadge": "Setup actual",
  "play.heroAccessoriesEmpty": "Sin accesorios puestos",
  "play.heroAccessoriesCount": ({ count }) => `${count} accesorios puestos`,
  "play.overviewFeaturedTitle": "Recompensas destacadas",
  "play.overviewFeaturedDescription":
    "Una selección más corta de objetos que vale la pena mirar enseguida.",
  "play.overviewRecommendedMissionsTitle": "Misiones recomendadas",
  "play.overviewRecommendedMissionsDescription":
    "Empieza por las metas más cobrables o con mejor impulso ahora mismo.",
  "play.overviewDescription":
    "Tu guarida de un vistazo, con accesos rápidos a tienda, colección, misiones y logros.",
  "play.overviewEquippedCompanion": "Equipado ahora",
  "play.overviewEquippedEnvironment": "Escena actual de la guarida",
  "play.overviewAccessoriesTitle": "Accesorios",
  "play.overviewAccessoriesSupport": "Puestos ahora",
  "play.overviewShopMeta": ({ count }) => `${count} recompensas listas para mirar`,
  "play.overviewCollectionMeta": ({ count }) => `${count} recompensas ya en tu colección`,
  "play.overviewMissionMeta": ({ daily, weekly }) =>
    `${daily} misiones diarias y ${weekly} semanales disponibles`,
  "play.overviewAchievementMeta": ({ count }) => `${count} hitos de largo plazo en seguimiento`,
  "play.unlockHint.recoveryDay":
    "Toma un día libre real o registra un día suave de recuperación para desbloquear esta recompensa.",
  "play.unlockHint.nonWorkday": "Toma un día no laborable para desbloquear esta recompensa.",
  "play.unlockHint.default": "Sigue avanzando para desbloquear esta recompensa.",
  "play.themeTag.focus": "Foco",
  "play.themeTag.craft": "Taller",
  "play.themeTag.recovery": "Recuperación",
  "play.shopNav": "Tienda",
  "play.collectionNav": "Colección",
  "play.missionsNav": "Misiones",
  "play.achievementsNav": "Logros",
  "play.emptyInventory": "Todavía no tienes objetos",
  "play.emptyInventoryDescription":
    "Cobra recompensas o compra algo en la tienda de la guarida para empezar tu colección.",
  "play.toastPurchaseTitle": "Compra lista",
  "play.toastPurchaseDescription": ({ title }) => `${title} ya se sumó a tu colección.`,
  "play.toastPurchaseFailedTitle": "No se pudo completar la compra",
  "play.toastEquipTitle": "Compañero actualizado",
  "play.toastEquipDescription": ({ title }) => `${title} ahora va con tu zorro.`,
  "play.toastEquipFailedTitle": "No se pudo equipar el objeto",
  "play.toastUnequipTitle": "Accesorio guardado",
  "play.toastUnequipDescription": ({ title }) => `${title} volvió por ahora al inventario.`,
  "play.toastUnequipFailedTitle": "No se pudo quitar el objeto",
  "play.moodLabel": "Ánimo del compañero",
  "play.moodSupportCalm": "Un ritmo parejo mantiene la guarida en calma.",
  "play.moodSupportCurious": "Tu zorro está atento a la próxima chispa pequeña.",
  "play.moodSupportFocused": "El ritmo actual dice que es hora de entrar en foco.",
  "play.moodSupportHappy": "El avance limpio le está levantando el ánimo a toda la guarida.",
  "play.moodSupportExcited": "Hay impulso de sobra y tu zorro lo siente.",
  "play.moodSupportCozy": "Un día libre de verdad deja la guarida tibia y sin apuro.",
  "play.moodSupportPlayful": "Un poco de avance en día libre mantiene la energía divertida.",
  "play.moodSupportTired": "La racha sigue viva, pero tu zorro agradecería un ritmo más suave.",
  "play.moodSupportDrained":
    "Hoy apretaste mucho. La guarida te pide recuperar en el siguiente paso.",
  "play.companionVariant.aurora.title": "Zorro aurora",
  "play.companionVariant.aurora.personality":
    "Luminoso, estable y de ánimo sereno. Aurora encaja con la energía base de Timely: impulso cálido sin volverse ruidoso.",
  "play.companionVariant.aurora.bestFor":
    "Días equilibrados, rachas limpias y una guarida que se sienta viva sin saturarse.",
  "play.companionVariant.arctic.title": "Zorro ártico",
  "play.companionVariant.arctic.personality":
    "Frío de cabeza y muy preciso. Arctic limpia el ambiente cuando quieres foco tranquilo y menos ruido emocional.",
  "play.companionVariant.arctic.bestFor":
    "Sesiones de concentración profunda, rutinas ordenadas y semanas donde pesa más la consistencia que el show.",
  "play.companionVariant.kitsune.title": "Zorro kitsune",
  "play.companionVariant.kitsune.personality":
    "Travieso, brillante y un poco teatral. Kitsune hace que incluso el avance pequeño se sienta vivo.",
  "play.companionVariant.kitsune.bestFor":
    "Sprints creativos, días suaves con juego y personas que quieren una guarida con magia.",
  "play.habitat.aurora.title": "Claro del bosque",
  "play.habitat.aurora.description":
    "Hierba suave, luz tibia y un ritmo fácil. Aurora se siente en casa en un lugar donde el avance constante todavía puede respirar.",
  "play.habitat.arctic.title": "Campo nevado",
  "play.habitat.arctic.description":
    "Un paisaje brillante, callado y de bordes limpios. Arctic encaja en una escena que transmite foco de punta a punta.",
  "play.habitat.kitsune.title": "Bosque del crepúsculo",
  "play.habitat.kitsune.description":
    "Un bosque encendido por tonos de tarde y energía traviesa. Kitsune vuelve la guarida un poco más extraña y mucho más viva.",
  "play.habitat.starlitCamp.title": "Campamento estelar",
  "play.habitat.starlitCamp.description":
    "Un campamento nocturno compartido, con calor de linterna, brasas suaves y un cielo más calmo arriba. Convierte cualquier guarida en refugio de turno largo.",
  "play.habitat.sunlitStudio.title": "Estudio al sol",
  "play.habitat.sunlitStudio.description":
    "Un estudio clay luminoso, con luz suave de día, estantes ordenados y una mesa hecha para crear con calma. Le da a toda la guarida una calidez más artesanal.",
  "play.habitat.rainyRetreat.title": "Refugio de lluvia",
  "play.habitat.rainyRetreat.description":
    "Un rincón sereno con ventanas lluviosas, cojines suaves y un silencio que hace que recuperarse se sienta merecido. Convierte la guarida en abrigo para los días lentos.",
  "play.habitat.propLantern": "Linterna",
  "play.habitat.propDesk": "Mesa",
  "play.habitat.propSnowDrift": "Montículo de nieve",
  "play.habitat.propGlowRing": "Anillo de brillo",
  "play.habitat.propWindow": "Ventana",
  "play.habitat.propCushion": "Cojín",
  "play.reward.aurora-evolution.name": "Evolución Aurora",
  "play.reward.aurora-evolution.description":
    "Una variante ártica más precisa para sesiones de foco profundo en la guarida.",
  "play.reward.kitsune-lumen.name": "Kitsune Lumen",
  "play.reward.kitsune-lumen.description":
    "Una compañera luminosa que hace que toda la guarida se sienta más mágica.",
  "play.reward.starlit-camp.name": "Campamento estelar",
  "play.reward.starlit-camp.description":
    "Un campamento nocturno con farol que convierte la guarida en un refugio sereno para turnos tardíos.",
  "play.reward.sunlit-studio.name": "Estudio soleado",
  "play.reward.sunlit-studio.description":
    "Una escena de taller de arcilla con luz suave para crear con calma durante el día.",
  "play.reward.rainy-retreat.name": "Retiro lluvioso",
  "play.reward.rainy-retreat.description":
    "Un rincón suave de recuperación con ventanas lluviosas, cojines y un ritmo más lento.",
  "play.reward.frame-signal.name": "Marco señal",
  "play.reward.frame-signal.description":
    "Un marco limpio para la mirada de tu zorro con vibra de escritorio preciso.",
  "play.reward.desk-constellation.name": "Constelación de escritorio",
  "play.reward.desk-constellation.description":
    "Un pequeño charm clay que añade un toque orbital a la guarida.",
  "play.reward.restful-tea-set.name": "Set de té reparador",
  "play.reward.restful-tea-set.description":
    "Un charm de recuperación que hace que los días lentos se sientan intencionales.",
  "play.reward.weekend-pennant.name": "Banderín de fin de semana",
  "play.reward.weekend-pennant.description":
    "Un pequeño estandarte para días libres reales y energía suave de fin de semana.",
  "play.reward.aurora-scarf.name": "Bufanda Aurora",
  "play.reward.aurora-scarf.description":
    "Una bufanda brillante que mantiene a tu zorro cómodo sin perder impulso.",
  "play.reward.comet-cap.name": "Gorra cometa",
  "play.reward.comet-cap.description":
    "Una gorra compacta para una presencia más ligera y juguetona.",
  "play.quest.balanced_day.title": "Día equilibrado",
  "play.quest.balanced_day.description": "Cumple tu objetivo de hoy sin pasarte.",
  "play.quest.balanced_day.rewardLabel": "50 fichas",
  "play.quest.clean_week.title": "Semana limpia",
  "play.quest.clean_week.description":
    "Construye una semana calendario sin días laborales por debajo del objetivo.",
  "play.quest.clean_week.rewardLabel": "75 fichas",
  "play.quest.issue_sprinter.title": "Sprinter de issues",
  "play.quest.issue_sprinter.description":
    "Avanza en varios work items distintos durante la semana calendario actual.",
  "play.quest.issue_sprinter.rewardLabel": "45 fichas",
  "play.quest.recovery_window.title": "Ventana de recuperación",
  "play.quest.recovery_window.description":
    "Toma tiempo de recuperación realmente ligero dentro de la semana calendario actual.",
  "play.quest.recovery_window.rewardLabel": "40 fichas",
  "play.quest.weekend_wander.title": "Paseo de fin de semana",
  "play.quest.weekend_wander.description":
    "Registra un día no laborable suave dentro de la semana calendario actual.",
  "play.quest.weekend_wander.rewardLabel": "35 fichas",
  "play.quest.streak_keeper.title": "Guardián de racha",
  "play.quest.streak_keeper.description": "Protege una racha de siete días sin romper la cadena.",
  "play.quest.streak_keeper.rewardLabel": "Insignia de huella de zorro",
  "play.noActiveQuests": "No hay misiones activas",
  "play.noActiveQuestsDescription": "Sincroniza tus datos para empezar misiones.",
  "gamification.weeklyStreak": "Racha semanal",
  "gamification.activeMissions": "Misiones activas",
  "gamification.complete": "¡Completa!",
  "gamification.dailyMissions": "Misiones diarias",
  "gamification.weeklyMissions": "Misiones semanales",
  "gamification.achievementLog": "Logros",
  "gamification.emptyDaily": "Todavía no hay misiones diarias",
  "gamification.emptyWeekly": "Todavía no hay misiones semanales",
  "gamification.emptyAchievements": "Todavía no hay logros",
  "gamification.emptyDailyDescription":
    "Sincroniza un poco más de actividad para desbloquear una tanda nueva para hoy.",
  "gamification.emptyWeeklyDescription":
    "El tablero semanal se irá llenando a medida que se afirme tu ritmo de trabajo.",
  "gamification.emptyAchievementsDescription":
    "Aquí aparecerán los hitos largos cuando tu zorro ya tenga historias más grandes para contar.",
  "gamification.category.focus": "Foco",
  "gamification.category.consistency": "Constancia",
  "gamification.category.milestone": "Hito",
  "gamification.activate": "Activar",
  "gamification.activeNow": "Activa ahora",
  "gamification.activeCount": ({ count, limit }) => `${count}/${limit} activas`,
  "gamification.toastQuestActivatedTitle": "Misión activada",
  "gamification.toastQuestActivatedDescription": ({ title }) =>
    `${title} ya quedó fijada en tu tablero activo.`,
  "gamification.toastQuestActivationFailedTitle": "No se pudo activar la misión",
  "gamification.claimReward": "Cobrar recompensa",
  "gamification.claimed": "Cobrada",
  "gamification.toastRewardClaimedTitle": "Recompensa cobrada",
  "gamification.toastRewardClaimedDescription": ({ title }) => `${title} ya entró en tu botín.`,
  "gamification.toastAchievementUnlockedTitle": "Logro desbloqueado",
  "gamification.toastQuestClaimFailedTitle": "No se pudo cobrar la recompensa",
  "audit.title": "Auditoría",
  "audit.note": "Faltantes y excesos.",
  "ui.close": "Cerrar",
  "tray.focus": "Foco",
  "tray.loadingStatus": "Cargando estado de la bandeja...",
  "tray.dayRefreshFailed": ({ error }) => `No se pudo actualizar el día en la bandeja: ${error}`,
  "tray.refreshFailedTitle": "Falló la actualización de la bandeja",
  "tray.goalMet": "Objetivo cumplido",
  "tray.logged": ({ hours }) => `${hours} registrados`,
  "tray.above": ({ hours }) => `${hours} por encima del objetivo`,
  "tray.left": ({ hours }) => `${hours} restantes`,
  "tray.syncFailed": "La sincronización falló",
  "tray.syncing": "Sincronizando",
  "week.target": ({ hours }) => `objetivo ${hours}`,
};

const ptMessages: MessageDictionary = {
  ...enMessages,
  "common.about": "Sobre",
  "common.auto": "Automático (Sistema)",
  "common.back": "Voltar",
  "common.continue": "Continuar",
  "common.day": "Dia",
  "common.daysShort": "d",
  "common.days": ({ count }) => `${count} ${Number(count) === 1 ? "dia" : "dias"}`,
  "common.failed": "Falhou",
  "common.getStarted": "Começar",
  "common.hide": "Ocultar",
  "common.home": "Início",
  "common.language": "Idioma",
  "common.loading": "Carregando",
  "common.loadingApp": "Carregando Timely",
  "common.never": "Nunca",
  "common.next": "Próximo",
  "common.noFlags": "Sem alertas",
  "common.notSet": "Não definido",
  "common.open": "Abrir",
  "common.oauth": "OAuth",
  "common.period": "Período",
  "common.pickDay": "Escolher dia",
  "common.pickPeriod": "Escolher período",
  "common.pickWeek": "Escolher semana",
  "common.quit": "Sair",
  "common.play": "Play",
  "common.previous": "Anterior",
  "common.retry": "Tentar novamente",
  "common.saveAndContinue": "Salvar e continuar",
  "common.searchCountry": "Buscar país",
  "common.searchTimezone": "Buscar fuso horário",
  "common.search": "Buscar...",
  "common.settings": "Configurações",
  "common.skipForNow": "Pular por agora",
  "common.sync": "Sincronizar",
  "common.syncNow": "Sincronizar agora",
  "common.syncing": "Sincronizando...",
  "common.thisPeriod": "Este período",
  "common.thisWeek": "Esta semana",
  "common.today": "Hoje",
  "common.viewLog": "Ver log",
  "common.week": "Semana",
  "common.worklog": "Worklog",
  "common.year": "Ano",
  "common.thisYear": "Este ano",
  "common.noResults": "Nenhum resultado encontrado.",
  "common.none": "Nenhum",
  "common.english": "Inglês",
  "common.spanish": "Espanhol",
  "common.portuguese": "Português",
  "timeInput.hours": "Horas",
  "timeInput.minutes": "Minutos",
  "timeInput.period": "AM ou PM",
  "common.status.empty": "vazio",
  "common.status.underTarget": "abaixo da meta",
  "common.status.onTrack": "no ritmo",
  "common.status.metTarget": "meta atingida",
  "common.status.overTarget": "acima da meta",
  "common.status.nonWorkday": "dia sem trabalho",
  "common.severity.high": "alta",
  "common.severity.medium": "média",
  "common.severity.low": "baixa",
  "sync.statusAria": ({ status }) => `Status da sincronização: ${status}`,
  "sync.logTitle": "Log de sincronização",
  "sync.logDescription": "Progresso ao vivo da sincronização e notas recentes da atividade.",
  "sync.done": "Concluído",
  "sync.failed": "Falhou",
  "sync.starting": "Iniciando sincronização...",
  "sync.noEntries": "Ainda não há entradas no log. Inicie uma sincronização primeiro.",
  "sync.toastCompleteTitle": "Sincronização concluída",
  "sync.toastCompleteDescription": ({ projects, entries, issues }) =>
    `${projects} projetos, ${entries} registros e ${issues} issues sincronizados.`,
  "sync.toastFailedTitle": "Falha na sincronização",
  "topBar.lastSynced": ({ value }) => `Última sincronização: ${value}`,
  "topBar.sync": "Sincronizar",
  "app.failedToLoad": "Falha ao carregar o Timely",
  "app.loadingWorklog": "Carregando worklog",
  "app.loadingPlayCenter": "Carregando área Play",
  "play.failedToLoadTitle": "Falha ao carregar a área Play",
  "play.failedToLoadDescription": "A área Play não está disponível no momento.",
  "app.loadingSettings": "Carregando configurações",
  "app.loadingSetup": "Carregando configuração",
  "app.loadingProviderSetup": "Carregando provedor",
  "app.loadingScheduleSetup": "Carregando agenda",
  "app.loadingSyncSetup": "Carregando sincronização",
  "app.loadingFinishScreen": "Carregando tela final",
  "home.finishSetup": "Conclua a configuração do seu espaço para desbloquear todos os recursos.",
  "home.continueSetup": "Continuar configuração",
  "home.heroToday": "Hoje",
  "home.heroLogged": "Registrado",
  "home.heroRemaining": "Restante",
  "home.heroStreak": "Sequência",
  "home.heroLoggedPill": ({ hours }) => `Registrado ${hours}`,
  "home.heroRemainingPill": ({ hours }) => `Faltam ${hours}`,
  "home.heroTargetDonePill": "Meta do dia pronta",
  "home.heroStreakPill": ({ streak }) => `Sequência ${streak}`,
  "home.heroRestDayPill": ({ companion }) => `${companion} está de folga`,
  "home.heroNoTargetPill": "Hoje não entra na meta",
  "home.heroStreakSafePill": ({ streak }) => `Sequência protegida ${streak}`,
  "home.ofTarget": ({ target }) => `de ${target} da meta`,
  "home.stillToLog": "ainda para registrar",
  "home.targetCleared": "meta concluída",
  "home.momentumAlive": "ritmo mantido",
  "home.readyToStart": "pronto para começar",
  "home.openToday": "Abrir hoje",
  "home.openThisWeek": "Abrir esta semana",
  "home.openThisPeriod": "Abrir este período",
  "home.compareDailyLoad": "Comparar carga diária",
  "home.reviewRangeSummary": "Revisar resumo do intervalo",
  "home.todayAtAGlance": "Hoje em resumo",
  "home.todayFocus": "Foco de hoje",
  "home.todayFocusNote": "Seus maiores blocos de tempo até agora.",
  "home.cleanSlate": "Um dia em branco hoje.",
  "home.noIssuesToday": "Nenhuma issue registrada hoje",
  "home.noIssuesTodayDescription":
    "Comece a registrar tempo para ver sua lista de foco ganhar vida.",
  "home.momentum": "Ritmo",
  "home.momentumNote": "Um pulso rápido desta semana e sua sequência atual.",
  "home.ctaToday": "Abrir registro de hoje",
  "home.ctaWeek": "Revisar esta semana",
  "home.ctaWeekNote": "Ver o ritmo por dia",
  "home.ctaPeriod": "Inspecionar intervalo",
  "home.ctaPeriodNote": "Ver tendências mais amplas",
  "home.petPanelTitle": "Status do companheiro",
  "home.petMoodCalm": "Calmo",
  "home.petMoodCurious": "Curioso",
  "home.petMoodFocused": "Focado",
  "home.petMoodHappy": "Feliz",
  "home.petMoodExcited": "Animado",
  "home.petMoodCozy": "De boa",
  "home.petMoodPlayful": "Brincalhão",
  "home.petMoodTired": "Cansado",
  "home.petMoodDrained": "Sem energia",
  "home.petMetricStreak": "Sequência",
  "home.petMetricFocus": "Foco",
  "home.petMetricRhythm": "Ritmo",
  "home.weeklyProgressTitle": "Progresso desta semana",
  "home.weeklyProgressNote": "Horas registradas contra a meta de cada dia útil.",
  "home.weeklyOffLabel": "folga",
  "home.streakPanelTitle": "Sequência atual",
  "home.streakPanelNote": "Mantenha a corrente viva e deixe a semana continuar aquecida.",
  "home.weeklyPulse": "Pulso semanal",
  "home.thisWeek": "Esta semana",
  "home.weeklyRhythmEmpty": "Sincronize seus dados para ver seu ritmo semanal aqui.",
  "home.streakEmpty": "Sincronize seus dados para ver sua sequência atual aqui.",
  "home.statusTempo": ({ companion, tempo }) => `${companion} está em ${tempo}`,
  "home.headlineVictoryTitle": ({ alias }) => `Bom ritmo, ${alias}.`,
  "home.headlineVictoryTempo": "modo vitória",
  "home.headlineVictorySupporting": "Você já atingiu sua meta.",
  "home.headlineVictoryDetail": "Agora é só manter o fechamento do dia organizado.",
  "home.headlineFocusTitle": ({ alias }) => `Ritmo constante, ${alias}.`,
  "home.headlineFocusTempo": "modo foco",
  "home.headlineFocusSupporting": "O dia está indo na direção certa.",
  "home.headlineFocusDetail": "Algumas sessões sólidas devem fechar a diferença.",
  "home.headlineWeekendTitle": ({ alias }) => `Ritmo leve, ${alias}.`,
  "home.headlineWeekendTempo": "modo fim de semana",
  "home.headlineWeekendSupporting": "Hoje não há meta de trabalho.",
  "home.headlineWeekendDetail": "Use a calmaria para recarregar ou organizar tarefas leves.",
  "home.headlineWarmupTitle": "Uma página limpa para hoje.",
  "home.headlineWarmupTempo": "modo aquecimento",
  "home.headlineWarmupSupporting": "Sua raposa está esperando o primeiro bloco registrado.",
  "home.headlineWarmupDetail": "Uma sessão focada já é suficiente para ganhar ritmo.",
  "home.headlineVictoryA": ({ alias }) => `Você fechou o dia com força, [[${alias}]].`,
  "home.headlineVictoryB": ({ alias }) => `Meta concluída. Bom fechamento, [[${alias}]].`,
  "home.headlineFocusA": ({ alias }) => `O dia está se encaixando bem, [[${alias}]].`,
  "home.headlineFocusB": ({ alias }) => `Bom ritmo, [[${alias}]]. O caminho está aberto.`,
  "home.headlineWeekendA": ({ alias }) => `Hoje pede um ritmo mais leve, [[${alias}]].`,
  "home.headlineWeekendB": ({ alias }) => `Um dia mais leve combina com você, [[${alias}]].`,
  "home.headlineHolidayA": ({ alias }) => `Hoje tem cara de feriado manso, [[${alias}]].`,
  "home.headlineHolidayB": ({ alias }) => `Ótimo dia para baixar o ritmo, [[${alias}]].`,
  "home.headlineWarmupA": ({ alias }) => `Tem uma página novinha esperando, [[${alias}]].`,
  "home.headlineWarmupB": ({ alias }) =>
    `O quadro está livre, [[${alias}]]. Já dá para puxar o ritmo.`,
  "home.insightTopIssue": ({ companion, issueKey, hours }) =>
    `${companion} diz que sua missão principal até agora é ${issueKey}. Você já gastou ${hours} nisso, então esse fio está guiando o dia.`,
  "home.insightWeekLogged": ({ companion, hours }) =>
    `${companion} já marcou ${hours} na semana visível. Mesmo que hoje esteja tranquilo, seu ritmo recente ainda conta uma boa história.`,
  "home.insightStart": ({ companion }) =>
    `${companion} está se alongando antes do primeiro sprint. Assim que sua primeira issue aparecer, esta tela vira seu pequeno centro de missão.`,
  "home.insightTopIssueA": ({ companion, issueKey, hours }) =>
    `[[${companion}]] não tira [[${issueKey}]] do radar. Já tem [[${hours}]] ali, então esse fio está puxando o dia.`,
  "home.insightTopIssueB": ({ companion, issueKey, hours }) =>
    `Agora [[${issueKey}]] é o centro do seu dia. [[${companion}]] já viu [[${hours}]] se acumularem nessa frente.`,
  "home.insightTopIssueC": ({ companion, issueKey, hours }) =>
    `O sinal mais forte do dia passa por [[${issueKey}]]. [[${companion}]] já viu [[${hours}]] caírem ali.`,
  "home.insightWeekA": ({ companion, hours }) =>
    `[[${companion}]] já viu [[${hours}]] aparecerem ao longo da semana, então até um dia mais quieto segue apoiado em ritmo de verdade.`,
  "home.insightWeekB": ({ companion, hours }) =>
    `A semana já soma [[${hours}]] de trabalho. [[${companion}]] lê isso como um ritmo que vale proteger.`,
  "home.insightWeekC": ({ companion, hours }) =>
    `Já existem [[${hours}]] por trás de você nesta semana. [[${companion}]] enxerga hoje como continuação, não como reinício.`,
  "home.insightNonWorkdayLoggedA": ({ companion, hours }) =>
    `[[${companion}]] curtiu esse avanço leve de [[${hours}]] hoje. Conta como cuidado, sem pesar o dia.`,
  "home.insightNonWorkdayLoggedB": ({ companion, hours }) =>
    `Mesmo em dia de folga, [[${companion}]] viu [[${hours}]] de movimento suave. O bastante para manter o fio sem forçar nada.`,
  "home.insightNonWorkdayRestA": ({ companion, holiday }) =>
    holiday
      ? `[[${companion}]] entrou em modo calmo por [[${holiday}]]. Hoje não é dia de correr atrás da barra.`
      : `[[${companion}]] está guardando um dia de folga de verdade. Sem meta para perseguir, só espaço para respirar.`,
  "home.insightNonWorkdayRestB": ({ companion, holiday }) =>
    holiday
      ? `[[${holiday}]] muda o ritmo do dia inteiro. [[${companion}]] prefere ver você recarregar do que forçar andamento.`
      : `Hoje fica fora do ritmo normal de trabalho. [[${companion}]] lê isso como recuperação, não como perda.`,
  "home.insightStartA": ({ companion }) =>
    `[[${companion}]] está calmo, esperando o primeiro movimento de verdade. Quando a primeira issue entrar, esta tela ganha vida.`,
  "home.insightStartB": ({ companion }) =>
    `Ainda não apareceu um sinal forte, mas [[${companion}]] já está pronto. Um bloco registrado acorda a tela toda.`,
  "home.insightStartC": ({ companion }) =>
    `[[${companion}]] está se alongando antes do primeiro sprint. Assim que você registrar o bloco inicial, o dia começa a tomar forma.`,
  "home.petCalmA": ({ companion, consistency }) =>
    `[[${companion}]] está calmo agora. Esse ritmo de [[${consistency}]] mostra que ainda dá para ganhar impulso sem correria.`,
  "home.petCalmB": ({ companion, focus }) =>
    `[[${companion}]] segue tranquilo. Um pouco mais de [[${focus}]] de foco já mudaria o tom do dia.`,
  "home.petFocusedA": ({ companion, focus, streak }) =>
    `[[${companion}]] entrou no foco. Com [[${focus}]] de trabalho concentrado e uma sequência de [[${streak}]], a próxima sessão pode encaixar tudo.`,
  "home.petFocusedB": ({ companion, consistency }) =>
    `[[${companion}]] parece afiado e pronto. Esse ritmo de [[${consistency}]] mostra que seus hábitos estão firmes.`,
  "home.petHappyA": ({ companion, streak, consistency }) =>
    `[[${companion}]] está feliz. Uma sequência de [[${streak}]] junto com [[${consistency}]] de consistência faz o dia parecer bem amarrado.`,
  "home.petHappyB": ({ companion, focus }) =>
    `[[${companion}]] está de ótimo humor. As [[${focus}]] de foco de hoje já viraram uma base sólida.`,
  "home.petExcitedA": ({ companion, streak }) =>
    `[[${companion}]] está animado e quer ver a sequência de [[${streak}]] continuar viva. Boa hora para aproveitar a energia.`,
  "home.petExcitedB": ({ companion, consistency }) =>
    `[[${companion}]] está vibrando. Um ritmo de [[${consistency}]] deixa a semana inteira com mais vida.`,
  "home.petNonWorkdayRestA": ({ companion }) =>
    `[[${companion}]] está curtindo a folga com calma. Um descanso bem feito também sustenta a semana.`,
  "home.petNonWorkdayRestB": ({ companion, streak }) =>
    `[[${companion}]] está tranquilo e enrolado no próprio canto. Sua sequência de [[${streak}]] segue protegida, então hoje não pede pressão.`,
  "home.petNonWorkdayActiveA": ({ companion, hours }) =>
    `[[${companion}]] gosta desse tipo de avanço leve. [[${hours}]] num dia de folga mantém o clima vivo sem roubar descanso.`,
  "home.petNonWorkdayActiveB": ({ companion, hours }) =>
    `[[${companion}]] viu [[${hours}]] caírem de leve hoje. O suficiente para dar graça ao dia sem transformar tudo em jornada.`,
  "worklog.weeklyBreakdown": "Resumo semanal",
  "worklog.weeklyBreakdownNote": ({ range }) =>
    `${range}. Escolha um dia para abrir o resumo completo.`,
  "worklog.weekSummary": "Resumo semanal",
  "worklog.periodSummary": "Resumo do período",
  "worklog.selectedRange": ({ range }) => `Intervalo selecionado: ${range}`,
  "worklog.daySummary": "Resumo do dia",
  "worklog.weekOf": ({ date }) => `Semana de ${date}`,
  "worklog.backTo": ({ parent }) => `Voltar para ${parent}`,
  "worklog.auditFlags": "Alertas de auditoria",
  "worklog.auditFlagsDescription":
    "Revise os itens que podem precisar de atenção neste recorte selecionado.",
  "worklog.noIssuesForDay": "Nenhuma issue registrada para este dia",
  "worklog.noIssuesForDayDescription": "Escolha outra data ou registre algum tempo.",
  "worklog.logged": "Registrado",
  "worklog.loggedNote": "Acompanhado no dia selecionado",
  "worklog.target": "Meta",
  "worklog.targetNote": "Carga planejada",
  "worklog.delta": "Diferença",
  "worklog.deltaPositive": "Na meta ou acima",
  "worklog.deltaNegative": "Ainda faltando",
  "worklog.issuesCount": "Issues",
  "worklog.noAuditFlags": "Sem alertas de auditoria",
  "worklog.auditFlagCount": ({ count }) =>
    `${count} ${Number(count) === 1 ? "alerta" : "alertas"} de auditoria`,
  "worklog.noIssues": "Nenhuma issue registrada para este dia",
  "worklog.pickDifferentDate": "Escolha outra data ou registre algum tempo.",
  "worklog.targetLabel": ({ hours }) => `meta ${hours}`,
  "worklog.failedToLoadTitle": "Falha ao carregar o registro",
  "worklog.gitlabConnectionRequired":
    "Conecte o GitLab em Configurações para carregar seu registro de trabalho.",
  "dashboard.weekTitle": "Semana",
  "dashboard.weekNote": "Horas na semana atual.",
  "dashboard.loggedTime": "Registrado",
  "dashboard.loggedAcrossRange": "Neste intervalo",
  "dashboard.expectedHours": "Previsto",
  "dashboard.expectedThroughYesterday": "Até ontem",
  "dashboard.expectedThroughYesterdayNote": "Até ontem.",
  "dashboard.expectedForRange": "Total do intervalo",
  "dashboard.expectedForRangeNote": "Até o fim selecionado.",
  "dashboard.missingHours": "Em falta",
  "dashboard.missingHoursNote": "O que ainda falta para chegar ao plano.",
  "dashboard.targetTime": "Meta",
  "dashboard.expectedLoad": "Previstas para este intervalo",
  "dashboard.cleanDays": "Dias dentro da meta",
  "dashboard.overflowCount": ({ count }) =>
    `${count} ${Number(count) === 1 ? "dia" : "dias"} acima da meta`,
  "dashboard.dailyBreakdown": "Detalhamento diário",
  "dashboard.pickDayToOpen": "Escolha um dia para abrir o resumo completo.",
  "settings.connection": "Conexão",
  "settings.providerSync": "Sincronização do provedor",
  "settings.connectedTo": ({ host }) => `Conectado a ${host}`,
  "settings.notConnected": "Não conectado",
  "settings.schedule": "Agenda",
  "settings.schedulePreferences": "Preferências da agenda",
  "settings.schedulePreferencesHint":
    "Fuso horário, primeiro dia da semana e formato de duração funcionam junto com sua agenda semanal acima.",
  "settings.calendarAndHolidays": "Calendário e feriados",
  "settings.appearance": "Aparência",
  "settings.accessibility": "Acessibilidade",
  "settings.theme": "Tema",
  "settings.motionPreference": "Movimento",
  "settings.motionPreferenceDescription":
    "Controla as animações decorativas do Timely. Sistema segue a preferência de acessibilidade do sistema operacional.",
  "settings.motionSystem": "Sistema",
  "settings.motionReduced": "Reduzido",
  "settings.motionFull": "Completo",
  "settings.motionSummary": ({ mode }) => `Movimento: ${mode}`,
  "settings.timeFormat": "Formato de tempo",
  "settings.hoursAndMinutes": "Horas e minutos",
  "settings.decimal": "Decimal",
  "settings.durationHint": "Controla como as durações são mostradas em todo o app.",
  "settings.hoursPerDaySummary": ({ hours }) => `${hours}h/dia`,
  "settings.sync": "Sincronização",
  "settings.dataManagement": "Gerenciamento de dados",
  "settings.resetDataDescription":
    "Redefine todos os dados locais, incluindo conexões, registros de tempo e configurações.",
  "settings.resetAllData": "Redefinir todos os dados",
  "settings.shiftStart": "Início do turno",
  "settings.shiftEnd": "Fim do turno",
  "settings.lunchBreak": "Pausa para almoço",
  "settings.netHoursPerDay": "Horas líquidas/dia",
  "settings.netHoursShort": "Líquidas",
  "settings.scheduleByDay": "Agenda por dia",
  "settings.weeklySchedule": "Agenda semanal",
  "settings.weeklyScheduleDescription":
    "Defina as horas normais de cada dia da sua semana de trabalho.",
  "settings.workingDay": "Dia de trabalho",
  "settings.workingHours": "Horário de trabalho",
  "settings.dayOff": "Folga",
  "settings.workWeek": "Semana de trabalho",
  "settings.previewWeekLabel": ({ range }) => `Semana de visualização: ${range}`,
  "settings.quickPresets": "Ajustes rápidos",
  "settings.standardWorkweek": "Semana de trabalho padrão",
  "settings.shortFridayPreset": "Sexta curta",
  "settings.customPreset": "Personalizado",
  "settings.applyToMatchingDays": "Aplicar aos dias iguais",
  "settings.applyToSelectedDays": "Aplicar aos dias escolhidos",
  "settings.applyToWholeWeek": "Aplicar à semana inteira",
  "settings.wholeWeekLabel": "Os 7 dias",
  "settings.hours": "Horas",
  "settings.holidayShort": "Feriado",
  "settings.copyToDays": "Copiar para...",
  "settings.copyDayScheduleTitle": ({ day }) => `Copiar horário de ${day}`,
  "settings.copyDayScheduleHint": "Escolha os dias que devem usar este horário.",
  "settings.copyDayScheduleEmpty": "Escolha pelo menos um dia.",
  "settings.copyDayScheduleApply": "Aplicar",
  "settings.setupDayOffHint": "Esse dia fica fora da sua meta semanal até você ativá-lo.",
  "settings.timezone": "Fuso horário",
  "settings.firstDayOfWeek": "Primeiro dia da semana",
  "settings.workdays": "Dias de trabalho",
  "settings.syncNow": "Sincronizar agora",
  "settings.lastSyncEntries": ({ count }) =>
    `Última sincronização: ${count} registros sincronizados`,
  "settings.pullLatest": "Buscar os dados mais recentes do GitLab",
  "settings.autoSync": "Sincronização automática",
  "settings.autoSyncDescription": "Buscar dados do GitLab automaticamente em segundo plano",
  "settings.syncInterval": "Intervalo de sincronização",
  "settings.intervalMinutes": ({ count }) => `${count} min`,
  "settings.intervalHours": ({ count }) => `${count} ${Number(count) === 1 ? "hora" : "horas"}`,
  "settings.manualOnly": "Somente manual",
  "settings.everyInterval": ({ interval }) => `A cada ${interval}`,
  "settings.windowBehavior": "Janela e bandeja",
  "settings.showTrayIcon": "Mostrar ícone na bandeja",
  "settings.showTrayIconDescription":
    "Mantenha o Timely disponível na bandeja do sistema enquanto ele continua rodando em segundo plano.",
  "settings.closeButtonAction": "Ao fechar a janela",
  "settings.closeButtonActionDescription":
    "O botão de fechar minimiza o Timely para a bandeja em vez de encerrar o app.",
  "settings.closeActionMinimizeToTray": "Minimizar para a bandeja",
  "settings.closeActionQuit": "Sair do app",
  "settings.traySummaryCloseToTray": "Bandeja ativada · ao fechar minimiza para a bandeja",
  "settings.traySummaryKeepTray": "Bandeja ativada · ao fechar encerra o app",
  "settings.traySummaryDisabled": "Bandeja desativada · ao fechar encerra o app",
  "settings.remindersSection": "Lembretes",
  "settings.remindersSummaryOff": "Lembretes desativados",
  "settings.remindersSummaryOn": ({ list }) => `Ativos · ${list}`,
  "settings.remindersNoTimes": "nenhum horário selecionado",
  "settings.remindersMaster": "Lembretes de fim de expediente",
  "settings.remindersMasterDescription":
    "Avisos curtos do sistema antes do fim do expediente para fechar o registro de trabalho.",
  "settings.remindersBeforeShiftEnd": "Minutos antes do fim do expediente",
  "settings.remindersMinutesLabel": ({ minutes }) => `${minutes} minutos`,
  "settings.remindersPermission": "Permissão de avisos do sistema",
  "settings.remindersPermissionUnknown":
    "Estado desconhecido — se nada aparecer, confira o Timely nas configurações de privacidade do sistema.",
  "settings.remindersPermissionGranted": "Permitido — o Timely pode mostrar avisos.",
  "settings.remindersPermissionDenied":
    "Bloqueado — ative o Timely nas configurações de avisos do sistema.",
  "settings.remindersPermissionPrompt":
    "Ainda não definido — o sistema pode perguntar na próxima vez.",
  "settings.remindersRequestPermission": "Pedir ao sistema",
  "settings.remindersPermissionRequestFailed": "Não foi possível pedir permissão de avisos",
  "settings.remindersTest": "Enviar aviso de verificação",
  "settings.remindersTestDescription": "Mostra um aviso de exemplo com a configuração atual.",
  "settings.remindersTestTitle": "Verificação do Timely",
  "settings.remindersTestBody": "Se você está lendo isto, os avisos de expediente funcionam.",
  "settings.remindersTestSent": "Aviso de verificação enviado",
  "settings.remindersTestFailed": "Não foi possível enviar o aviso de verificação",
  "settings.diagnosticsSection": "Diagnóstico",
  "settings.diagnosticsSummary": ({ count }) => `${count} entradas`,
  "settings.remindersPermissionHintInteractive":
    "Este botão pode abrir um pedido de permissão do sistema nesta plataforma.",
  "settings.remindersPermissionHintSystemSettings":
    "Nesta plataforma normalmente você ajusta isso nas configurações de avisos do sistema.",
  "settings.remindersPermissionNoSystemPrompt": "Nenhum pedido do sistema apareceu",
  "settings.remindersPermissionNoChangeInteractive":
    "O estado não mudou. Se nenhum pedido apareceu, confira os avisos do sistema para o Timely.",
  "settings.remindersPermissionNoChangeSystemSettings":
    "Aqui geralmente não há pedido em tempo real. Abra os avisos do sistema para o Timely.",
  "settings.remindersOpenSystemSettings": "Abrir configurações do sistema",
  "settings.remindersOpenSystemSettingsSuccess": "Configurações de avisos do sistema abertas",
  "settings.remindersOpenSystemSettingsFailed":
    "Não foi possível abrir as configurações de avisos do sistema",
  "settings.remindersPermissionDeniedCannotSend":
    "O Timely está bloqueado nos avisos do sistema. Ative e tente novamente.",
  "settings.remindersDiagnosticsTitle": "Console de diagnóstico",
  "settings.remindersDiagnosticsDescription":
    "Use este console quando os lembretes falharem. Você pode atualizar, limpar, copiar ou exportar as entradas recentes.",
  "settings.remindersDiagnosticsCount": ({ count }) => `${count} entradas`,
  "settings.diagnosticsFeatureFilter": "Recurso",
  "settings.diagnosticsFeatureFilterAll": "Tudo",
  "settings.diagnosticsFeatureFilterNotifications": "Avisos",
  "settings.remindersDiagnosticsRefresh": "Atualizar",
  "settings.remindersDiagnosticsClear": "Limpar registros",
  "settings.remindersDiagnosticsCopy": "Copiar relatório",
  "settings.remindersDiagnosticsExport": "Exportar relatório",
  "settings.remindersDiagnosticsLoading": "Carregando diagnóstico...",
  "settings.remindersDiagnosticsEmpty": "Ainda não há entradas de diagnóstico.",
  "settings.remindersDiagnosticsCleared": "Registros de diagnóstico limpos",
  "settings.remindersDiagnosticsClearFailed": "Não foi possível limpar os registros de diagnóstico",
  "settings.remindersDiagnosticsCopied": "Relatório de diagnóstico copiado",
  "settings.remindersDiagnosticsCopyFailed": "Não foi possível copiar o relatório de diagnóstico",
  "settings.remindersDiagnosticsExported": "Relatório de diagnóstico exportado",
  "settings.remindersDiagnosticsExportFailed":
    "Não foi possível exportar o relatório de diagnóstico",
  "settings.saveSchedule": "Salvar agenda",
  "settings.savingSchedule": "Salvando alterações...",
  "settings.scheduleSaved": "Agenda salva",
  "settings.scheduleSaveToastSuccessTitle": "Agenda atualizada",
  "settings.scheduleSaveToastSuccessDescription":
    "Sua semana de trabalho, fuso horário e primeiro dia da semana foram gravados. O registro de trabalho e as metas diárias já usam os novos valores.",
  "settings.scheduleSaveToastErrorTitle": "Não foi possível salvar a agenda",
  "settings.scheduleSaveToastErrorFallback": "Algo deu errado ao salvar. Tente novamente.",
  "settings.updates": "Atualizações",
  "settings.updatesOverviewTitle": "Detalhes da build",
  "settings.updatesInstalledVersion": "Versão instalada",
  "settings.updatesInstalledVersionHint": "Versão instalada atualmente neste dispositivo.",
  "settings.updatesReleaseChannel": "Canal da build",
  "settings.updatesReleaseChannelHint": "Canal usado para gerar esta build de desktop.",
  "settings.updatesDescription":
    "Confira a release mais recente do canal escolhido e instale quando estiver pronta.",
  "settings.updatesIdleDescription":
    "Escolha um canal e verifique a release mais recente disponível para este app.",
  "settings.updatesToastChecking": "Procurando uma release mais recente para o canal selecionado.",
  "settings.updatesToastInstalling": "Baixando e preparando a atualização selecionada.",
  "settings.updatesToastRestarting": "Reiniciando o Timely para concluir a atualização.",
  "settings.updatesChannel": "Canal de atualização",
  "settings.updatesChannelStable": "Estável",
  "settings.updatesChannelUnstable": "Instável",
  "settings.updatesChannelHint":
    "Estável recebe releases de produção. Instável recebe prereleases primeiro.",
  "settings.updatesBuildChannelStable": "Build estável",
  "settings.updatesBuildChannelUnstable": "Build instável",
  "settings.updatesSummary": ({ channel }) => `Acompanhando ${channel}`,
  "settings.updatesAvailableShort": ({ version }) => `Atualização ${version} disponível`,
  "settings.updatesReadyShort": "Pronta para reiniciar",
  "settings.updatesReady": ({ version }) => `A atualização ${version} está pronta`,
  "settings.updatesAvailable": ({ version }) => `Atualização ${version} disponível`,
  "settings.updatesReadyDescription":
    "A atualização já foi instalada. Reinicie o Timely para concluir a aplicação.",
  "settings.updatesAvailableDescription":
    "Há uma build mais nova disponível para o canal selecionado.",
  "settings.updatesPublishedOn": ({ date }) => `Publicada em ${date}`,
  "settings.updatesReleaseNotes": "Notas da versão",
  "settings.updatesDownloadProgress": ({ progress }) => `Baixando ${progress}`,
  "settings.updatesUnknownProgress": "Baixando atualização...",
  "settings.updatesUpToDate": "Tudo está atualizado",
  "settings.updatesNoUpdate": "Não há versão mais nova disponível para este canal agora.",
  "settings.updatesCheckFailed": "Não foi possível verificar atualizações",
  "settings.updatesInstallFailed": "Não foi possível instalar a atualização",
  "settings.updatesChecking": "Verificando...",
  "settings.updatesCheck": "Verificar atualizações",
  "settings.updatesInstall": "Instalar atualização",
  "settings.updatesInstalling": "Instalando...",
  "settings.updatesRestart": "Reiniciar para atualizar",
  "settings.updatesRestartFailed": "Não foi possível reiniciar para concluir a atualização",
  "settings.updatesChannelSaveFailed": "Falha ao salvar o canal de atualização",
  "settings.aboutSectionTitle": "Sobre",
  "settings.aboutSectionDescription": "Veja a versão instalada e o canal desta compilação.",
  "settings.viewAppDetails": "Ver detalhes do app",
  "settings.themeSummary": ({ theme }) => `Tema: ${theme}`,
  "settings.failedHolidayPreferences": "Falha ao salvar preferências de feriados",
  "settings.failedSchedule": "Falha ao salvar agenda",
  "settings.tryAgain": "Tente novamente.",
  "settings.system": "Sistema",
  "settings.light": "Claro",
  "settings.dark": "Escuro",
  "settings.languageSummary": ({ language }) => `Idioma: ${language}`,
  "settings.accessibilitySummary": ({ language }) => `Idioma: ${language}`,
  "settings.holidaySource": "Origem dos feriados",
  "settings.detected": "Detectado",
  "settings.useDetected": "Usar detectado",
  "settings.holidays": "Feriados",
  "settings.noCountry": "Sem país",
  "settings.noHolidaysForYear": ({ year }) => `Nenhum feriado disponível para ${year}.`,
  "settings.couldNotLoadHolidays": "Não foi possível carregar os feriados.",
  "providers.connectGitLab": "Conectar GitLab",
  "providers.linkGitLab": "Conecte sua conta GitLab para começar a rastrear tempo.",
  "providers.accessToken": "Token de acesso",
  "providers.quick": "rápido",
  "providers.gitLabHost": "Host do GitLab",
  "providers.personalAccessToken": "Token de acesso pessoal",
  "providers.needToken": "Precisa de um token?",
  "providers.createOneOn": ({ host }) => `Crie um em ${host}`,
  "providers.withReadApiScope": "com escopo read_api.",
  "providers.connectWithToken": "Conectar com token",
  "providers.oauthAppId": "ID do aplicativo OAuth",
  "providers.createOAuthApp": "Criar app OAuth",
  "providers.oauthScopes":
    "com os escopos read_api e read_user. Defina a URI de redirecionamento como timely://auth/gitlab",
  "providers.waitingForAuthorization": "Aguardando autorização do GitLab...",
  "providers.completeSignIn":
    "Conclua o login na janela de autenticação. O app detectará o callback automaticamente.",
  "providers.pasteCallbackManually": "O callback falhou? Cole manualmente",
  "providers.connectWithGitLab": "Conectar com GitLab",
  "providers.validatingToken": "Validando token...",
  "providers.authenticatedAs": ({ username, name }) => `Autenticado como @${username} (${name})`,
  "providers.connectedToHost": ({ host }) => `Conectado a ${host}`,
  "providers.disconnect": "Desconectar",
  "providers.gitLabLinked": "GitLab conectado",
  "providers.oauthComplete": "Autenticação OAuth concluída.",
  "providers.oauthFailed": "OAuth falhou",
  "providers.oauthCallbackFailed": ({ error }) => `Falha no callback OAuth: ${error}`,
  "providers.hostAndClientRequired": "Host e Client ID são obrigatórios para OAuth.",
  "providers.connectionFailed": "Falha na conexão",
  "providers.hostAndTokenRequired": "Host e token de acesso pessoal são obrigatórios.",
  "providers.connectedToGitLab": "Conectado ao GitLab",
  "providers.tokenSavedFor": ({ host }) => `Token salvo para ${host}`,
  "providers.tokenValidated": "Token validado",
  "providers.authenticatedUser": ({ username }) => `Autenticado como @${username}`,
  "providers.tokenValidationFailed": "Falha na validação do token",
  "providers.manualCallbackPrompt": "Cole a URL de callback do navegador:",
  "providers.manualCallbackResolved": "Callback OAuth resolvido manualmente.",
  "providers.callbackValidationFailed": ({ error }) => `Falha na validação do callback: ${error}`,
  "providers.oauthPkceFallback": "OAuth PKCE + fallback PAT",
  "providers.oauthPkce": "OAuth PKCE",
  "about.title": "Sobre o Timely",
  "about.subtitle": "Informações deste app para desktop.",
  "about.versionLabel": "Versão",
  "about.desktopBuild": "Build para desktop",
  "about.prereleaseTitle": "Canal de pré-lançamento",
  "about.prereleaseDescription": ({ label }) =>
    `Você está usando a build de pré-lançamento ${label}.`,
  "releaseHighlights.dialogTitle": "Novidades do Timely",
  "releaseHighlights.dialogDescription": ({ version }) => `Veja os destaques do Timely ${version}.`,
  "releaseHighlights.gotIt": "Entendi",
  "onboarding.welcomeDescription":
    "Seu painel pessoal de rastreamento de tempo sincronizado com o GitLab. Vamos fazer um tour rápido para mostrar como tudo funciona.",
  "onboarding.progressDescription":
    "O anel de progresso mostra o quanto você está perto da sua meta diária. Ele preenche conforme você registra mais tempo ao longo do dia.",
  "onboarding.issuesDescription":
    "Veja exatamente em quais issues você gastou tempo hoje, ordenadas por horas. Cada entrada corresponde a uma issue do GitLab dos seus projetos sincronizados.",
  "onboarding.weekDescription":
    "Uma visão visual da sua semana mostrando horas registradas por dia versus sua meta. Identifique tendências e mantenha consistência.",
  "onboarding.worklogDescription":
    "Aprofunde-se nos seus registros de tempo. Alterne entre visões para inspecionar worklogs diários, semanais ou mensais e alertas de auditoria.",
  "onboarding.settingsDescription":
    "Vá aqui para conectar sua conta do GitLab usando token pessoal ou OAuth. Depois de conectado, clique em Sincronizar para trazer seus registros reais.",
  "onboarding.doneDescription":
    "Esse foi o tour! Conecte sua conta do GitLab em Configurações para começar a acompanhar suas horas reais. Bom trabalho!",
  "setup.welcomeTitle": "Bem-vindo ao Timely",
  "setup.welcomeDescription": "Seu companheiro pessoal de worklog. Vamos configurar seu espaço.",
  "tray.focus": "Foco",
  "tray.goalMet": "Meta cumprida",
  "tray.above": ({ hours }) => `${hours} acima da meta`,
  "setup.scheduleTitle": "Quando você trabalha?",
  "setup.scheduleDescription": "Defina seu horário e seus dias de trabalho",
  "setup.providerTitle": "Conectar GitLab",
  "setup.providerDescription": "Conecte sua conta para começar a rastrear tempo",
  "setup.syncTitle": "Sincronize seus dados",
  "setup.syncDescriptionConnected": "Buscando seus worklogs do GitLab",
  "setup.syncDescriptionDisconnected": "Você pode sincronizar depois em Configurações",
  "setup.noProviderYet":
    "Ainda não há provedor conectado. Você pode sincronizar depois da configuração.",
  "setup.syncComplete": "Sincronização concluída",
  "setup.doneTitle": "Tudo pronto!",
  "setup.doneDescription": "Seu espaço está pronto. Hora de começar a rastrear!",
  "setup.finishing": "Concluindo configuracao...",
  "setup.openTimely": "Abrir Timely",
  "setup.continueButton": "Continuar",
  "setup.connectionGuideTitle": "Conclua a conexão com o GitLab",
  "setup.connectionGuideIntro":
    "Você pulou o assistente, então vamos terminar a configuração restante aqui em Configurações conectando o GitLab com token pessoal ou OAuth.",
  "setup.connectionGuideConnectionSection":
    "Esta seção de conexão é onde o Timely se liga ao GitLab. Escolha o caminho mais simples para você, conecte e depois sincronize seus dados.",
  "setup.connectionGuidePat":
    "Access Token é a opção mais rápida. Este link abre no navegador a página de tokens do GitLab para criar um token com escopo read_api e colar aqui.",
  "setup.connectionGuideOauthTab":
    "OAuth é a opção via navegador. Use se preferir autorizar com um app do GitLab em vez de criar um token manualmente.",
  "setup.connectionGuideOauthLink":
    "Isto abre no navegador a página de Applications do GitLab. Crie um app, configure a redirect URI como timely://auth/gitlab e depois copie o Application ID para cá.",
  "setup.connectionGuideSync":
    "Depois de conectar por qualquer um dos dois métodos, clique em Sync na barra superior para puxar seus worklogs do GitLab para o Timely.",
  "play.feeling": ({ mood }) => `Clima: ${mood}`,
  "play.level": "Nível",
  "play.xp": "XP",
  "play.streak": "Sequência",
  "play.tokens": "Tokens",
  "play.storeTitle": "Loja da toca",
  "play.inventoryTitle": "Coleção",
  "play.storeDescription": "Gaste tokens em mimos clay para sua companheira e a toca dela.",
  "play.storeFeatured": "Destaques da toca",
  "play.storeCompanions": "Linha de companheiras",
  "play.storeAccessories": "Prateleira de acessórios",
  "play.storeFeaturedDescription": "Recompensas com mais presença e um pouco mais de brilho.",
  "play.storeCompanionsDescription": "Grandes desbloqueios para sua raposa e a identidade dela.",
  "play.storeAccessoriesDescription": "Peças do dia a dia e pequenos tesouros clay.",
  "play.storeBrowseTitle": "Explore a loja da toca",
  "play.storeBrowseDescription":
    "Escolha uma seção, refine a prateleira e teste combinações antes de comprar.",
  "play.storeBrowseCount": ({ count }) => `${count} recompensas nesta vista`,
  "play.storeTabAll": "Tudo",
  "play.storeTabFeatured": "Destaques",
  "play.storeTabCompanions": "Companheiras",
  "play.storeTabAccessories": "Acessórios",
  "play.storeSecondaryFilters": "Filtros da loja",
  "play.filterAll": "Tudo",
  "play.filterOwned": "Seus",
  "play.filterLocked": "Bloqueados",
  "play.filterHabitats": "Habitats",
  "play.filterWearables": "Itens vestíveis",
  "play.filterRecovery": "Recuperação",
  "play.emptyStoreFilterTitle": "Nada nesta prateleira ainda",
  "play.emptyStoreFilterDescription":
    "Experimente outra seção ou filtro para ver mais recompensas.",
  "play.clearPreview": "Limpar preview",
  "play.pageLabel": ({ current, total }) => `Página ${current} de ${total}`,
  "play.shopRouteDescription": "Cards visíveis, previews rápidos e compras diretas.",
  "play.collectionRouteDescription":
    "Tudo o que sua raposa possui, com ações diretas para equipar e visualizar.",
  "play.missionsRouteDescription": "Acompanhe, ative e resgate suas metas diárias e semanais.",
  "play.achievementsRouteDescription":
    "Marcos desbloqueados e progresso de longo prazo da companheira.",
  "play.collectionCompanionsTitle": "Companheiras",
  "play.collectionCompanionsDescription": "As variantes de raposa disponíveis para você.",
  "play.collectionHabitatsDescription": "Ambientes seus que podem mudar o clima da toca.",
  "play.collectionAccessoriesDescription": "Itens seus que a raposa pode usar agora mesmo.",
  "play.rarity.common": "Comum",
  "play.rarity.rare": "Raro",
  "play.rarity.epic": "Épico",
  "play.inventoryDescription": "Tudo o que sua raposa já conquistou e pode exibir.",
  "play.inventoryHabitatsTitle": "Cenas do habitat",
  "play.inventoryHabitatsDescription": "Ambientes colecionados para mudar o clima da toca.",
  "play.inventoryAccessoriesTitle": "Acessórios e pequenos tesouros",
  "play.inventoryAccessoriesDescription": "Tudo o que sua raposa pode vestir ou levar para a cena.",
  "play.companionSpotlightTitle": "Companheira em destaque",
  "play.companionSpotlightDescription":
    "Um olhar mais de perto para a raposa que está guiando o clima da sua toca agora.",
  "play.companionSpotlightBestFor": "Combina com",
  "play.companionSpotlightHint": "Toque em uma companheira na loja para ver a vibe dela aqui.",
  "play.habitatTitle": "Cena do habitat",
  "play.habitatDescription": "Um pequeno diorama para a companheira que está em destaque agora.",
  "play.habitatNowShowing": "Em cena",
  "play.habitatModeDefault": "Habitat base",
  "play.habitatModeEquipped": "Cena equipada",
  "play.habitatModePreview": "Previa da cena",
  "play.slot.headwear": "Cabeça",
  "play.slot.eyewear": "Olhar",
  "play.slot.neckwear": "Pescoço",
  "play.slot.charm": "Amuleto",
  "play.slot.environment": "Ambiente",
  "play.slot.companion": "Companheira",
  "play.buy": "Comprar",
  "play.equip": "Equipar",
  "play.unequip": "Guardar",
  "play.owned": "Já é seu",
  "play.available": "Disponível",
  "play.preview": "Ver",
  "play.previewing": "Em foco",
  "play.previewPanelTitle": "Preview",
  "play.previewPanelDescription":
    "O preview compartilhado se atualiza a partir da loja e da coleção.",
  "play.previewPanelBadge": "Preview atual",
  "play.locked": "Bloqueado",
  "play.openSection": "Abrir seção",
  "play.heroEyebrow": "Toca atual",
  "play.heroSceneBadge": "Setup atual",
  "play.heroAccessoriesEmpty": "Sem acessórios equipados",
  "play.heroAccessoriesCount": ({ count }) => `${count} acessórios equipados`,
  "play.overviewFeaturedTitle": "Recompensas em destaque",
  "play.overviewFeaturedDescription":
    "Uma prateleira mais enxuta com itens que valem o próximo preview.",
  "play.overviewRecommendedMissionsTitle": "Missões recomendadas",
  "play.overviewRecommendedMissionsDescription":
    "Comece pelas metas mais resgatáveis ou com melhor embalo agora.",
  "play.overviewDescription":
    "Sua toca em um relance, com atalhos para loja, coleção, missões e conquistas.",
  "play.overviewEquippedCompanion": "Equipada agora",
  "play.overviewEquippedEnvironment": "Cena atual da toca",
  "play.overviewAccessoriesTitle": "Acessórios",
  "play.overviewAccessoriesSupport": "Sendo usados agora",
  "play.overviewShopMeta": ({ count }) => `${count} recompensas prontas para explorar`,
  "play.overviewCollectionMeta": ({ count }) => `${count} recompensas já na sua coleção`,
  "play.overviewMissionMeta": ({ daily, weekly }) =>
    `${daily} missões diárias e ${weekly} semanais disponíveis`,
  "play.overviewAchievementMeta": ({ count }) => `${count} marcos de longo prazo em andamento`,
  "play.unlockHint.recoveryDay":
    "Tire um dia livre de verdade ou registre um dia leve de recuperação para desbloquear esta recompensa.",
  "play.unlockHint.nonWorkday": "Faça um dia sem trabalho para desbloquear esta recompensa.",
  "play.unlockHint.default": "Continue progredindo para desbloquear esta recompensa.",
  "play.themeTag.focus": "Foco",
  "play.themeTag.craft": "Ateliê",
  "play.themeTag.recovery": "Recuperação",
  "play.shopNav": "Loja",
  "play.collectionNav": "Coleção",
  "play.missionsNav": "Missões",
  "play.achievementsNav": "Conquistas",
  "play.emptyInventory": "Ainda não há itens",
  "play.emptyInventoryDescription":
    "Resgate recompensas ou compre algo na loja da toca para começar sua coleção.",
  "play.toastPurchaseTitle": "Compra concluída",
  "play.toastPurchaseDescription": ({ title }) => `${title} entrou para a sua coleção.`,
  "play.toastPurchaseFailedTitle": "Não foi possível concluir a compra",
  "play.toastEquipTitle": "Companheira atualizada",
  "play.toastEquipDescription": ({ title }) => `${title} agora está na sua raposa.`,
  "play.toastEquipFailedTitle": "Não foi possível equipar o item",
  "play.toastUnequipTitle": "Acessório guardado",
  "play.toastUnequipDescription": ({ title }) => `${title} voltou para a coleção por enquanto.`,
  "play.toastUnequipFailedTitle": "Não foi possível guardar o item",
  "play.moodLabel": "Clima do companheiro",
  "play.moodSupportCalm": "Um ritmo estável deixa a toca em paz.",
  "play.moodSupportCurious": "Sua raposa está esperando a próxima faísca pequena.",
  "play.moodSupportFocused": "O ritmo atual pede concentração de verdade.",
  "play.moodSupportHappy": "O progresso limpo está deixando a toca inteira mais leve.",
  "play.moodSupportExcited": "O embalo está alto e sua raposa sentiu isso.",
  "play.moodSupportCozy": "Uma folga de verdade deixa a toca quentinha e sem pressa.",
  "play.moodSupportPlayful": "Um avanço leve na folga mantém a energia divertida.",
  "play.moodSupportTired": "A sequência segue viva, mas sua raposa toparia um ritmo mais gentil.",
  "play.moodSupportDrained":
    "Você puxou demais hoje. A toca está pedindo recuperação no próximo passo.",
  "play.companionVariant.aurora.title": "Raposa aurora",
  "play.companionVariant.aurora.personality":
    "Brilhante, estável e discretamente acolhedora. Aurora combina com a energia base do Timely: embalo quente sem exagero.",
  "play.companionVariant.aurora.bestFor":
    "Dias equilibrados, sequências limpas e uma toca animada sem ficar barulhenta.",
  "play.companionVariant.arctic.title": "Raposa ártica",
  "play.companionVariant.arctic.personality":
    "Fria na cabeça e precisa no ritmo. Arctic deixa a mesa mais nítida quando você quer foco calmo e menos ruído emocional.",
  "play.companionVariant.arctic.bestFor":
    "Blocos de foco profundo, rotinas organizadas e semanas em que consistência vale mais que euforia.",
  "play.companionVariant.kitsune.title": "Raposa kitsune",
  "play.companionVariant.kitsune.personality":
    "Travessa, luminosa e um pouco teatral. Kitsune faz até o progresso pequeno parecer cheio de vida.",
  "play.companionVariant.kitsune.bestFor":
    "Sprints criativos, folgas com progresso leve e gente que quer uma toca com um toque mágico.",
  "play.habitat.aurora.title": "Clareira da floresta",
  "play.habitat.aurora.description":
    "Grama macia, luz morna e um ritmo leve. Aurora combina com um lugar onde o progresso constante ainda pode respirar.",
  "play.habitat.arctic.title": "Campo de neve",
  "play.habitat.arctic.description":
    "Uma paisagem clara, silenciosa e de contornos nítidos. Arctic pertence a uma cena que transmite foco de ponta a ponta.",
  "play.habitat.kitsune.title": "Bosque do crepúsculo",
  "play.habitat.kitsune.description":
    "Um bosque brilhando em tons de fim de tarde e energia de trapaceira. Kitsune deixa a toca mais estranha no melhor sentido e muito mais viva.",
  "play.habitat.starlitCamp.title": "Acampamento estrelado",
  "play.habitat.starlitCamp.description":
    "Um acampamento noturno compartilhado, com calor de lanterna, luz de brasa e um céu mais calmo lá em cima. Ele transforma qualquer canto em abrigo de jornada longa.",
  "play.habitat.sunlitStudio.title": "Ateliê ensolarado",
  "play.habitat.sunlitStudio.description":
    "Um ateliê clay claro, com luz suave do dia, prateleiras organizadas e uma mesa feita para criar com calma. Ele dá para a toca inteira um calor mais artesanal.",
  "play.habitat.rainyRetreat.title": "Refúgio de chuva",
  "play.habitat.rainyRetreat.description":
    "Um canto silencioso com janelas chuvosas, almofadas macias e um tipo de calma que faz a recuperação parecer merecida. Ele transforma a toca em abrigo para dias mais lentos.",
  "play.habitat.propLantern": "Lanterna",
  "play.habitat.propDesk": "Mesa",
  "play.habitat.propSnowDrift": "Monte de neve",
  "play.habitat.propGlowRing": "Anel de brilho",
  "play.habitat.propWindow": "Janela",
  "play.habitat.propCushion": "Almofada",
  "play.reward.aurora-evolution.name": "Evolução Aurora",
  "play.reward.aurora-evolution.description":
    "Uma variante ártica mais precisa para sessões de foco profundo na toca.",
  "play.reward.kitsune-lumen.name": "Kitsune Lumen",
  "play.reward.kitsune-lumen.description":
    "Uma companheira luminosa que deixa toda a toca com um ar mais mágico.",
  "play.reward.starlit-camp.name": "Acampamento estrelado",
  "play.reward.starlit-camp.description":
    "Um acampamento noturno com lanterna que transforma a toca num refúgio calmo para turnos tardios.",
  "play.reward.sunlit-studio.name": "Estúdio ensolarado",
  "play.reward.sunlit-studio.description":
    "Uma cena de estúdio clay com luz suave para criar com cuidado durante o dia.",
  "play.reward.rainy-retreat.name": "Refúgio chuvoso",
  "play.reward.rainy-retreat.description":
    "Um canto suave de recuperação com janelas chuvosas, almofadas e um ritmo mais lento.",
  "play.reward.frame-signal.name": "Armação sinal",
  "play.reward.frame-signal.description":
    "Uma armação limpa para dar à sua raposa um visual de mesa mais preciso.",
  "play.reward.desk-constellation.name": "Constelação de mesa",
  "play.reward.desk-constellation.description":
    "Um pequeno charme clay que adiciona um toque orbital à toca.",
  "play.reward.restful-tea-set.name": "Conjunto de chá repousante",
  "play.reward.restful-tea-set.description":
    "Um charme de recuperação que faz os dias lentos parecerem intencionais.",
  "play.reward.weekend-pennant.name": "Flâmula de fim de semana",
  "play.reward.weekend-pennant.description":
    "Uma pequena bandeira para dias livres reais e uma energia leve de fim de semana.",
  "play.reward.aurora-scarf.name": "Cachecol Aurora",
  "play.reward.aurora-scarf.description":
    "Um cachecol vibrante que deixa sua raposa aconchegada sem perder ritmo.",
  "play.reward.comet-cap.name": "Boné cometa",
  "play.reward.comet-cap.description": "Um boné compacto para uma presença mais leve e divertida.",
  "play.quest.balanced_day.title": "Dia equilibrado",
  "play.quest.balanced_day.description": "Cumpra sua meta de hoje sem exagerar.",
  "play.quest.balanced_day.rewardLabel": "50 fichas",
  "play.quest.clean_week.title": "Semana limpa",
  "play.quest.clean_week.description": "Monte uma semana-calendário sem dias úteis abaixo da meta.",
  "play.quest.clean_week.rewardLabel": "75 fichas",
  "play.quest.issue_sprinter.title": "Sprinter de tarefas",
  "play.quest.issue_sprinter.description":
    "Avance em work items distintos durante a semana-calendário atual.",
  "play.quest.issue_sprinter.rewardLabel": "45 fichas",
  "play.quest.recovery_window.title": "Janela de recuperação",
  "play.quest.recovery_window.description":
    "Tenha um tempo de recuperação realmente leve dentro da semana-calendário atual.",
  "play.quest.recovery_window.rewardLabel": "40 fichas",
  "play.quest.weekend_wander.title": "Passeio de fim de semana",
  "play.quest.weekend_wander.description":
    "Registre um dia sem trabalho leve dentro da semana-calendário atual.",
  "play.quest.weekend_wander.rewardLabel": "35 fichas",
  "play.quest.streak_keeper.title": "Guardião da sequência",
  "play.quest.streak_keeper.description":
    "Proteja uma sequência de sete dias sem quebrar a corrente.",
  "play.quest.streak_keeper.rewardLabel": "Insígnia de trilha da raposa",
  "play.noActiveQuests": "Sem missões ativas",
  "play.noActiveQuestsDescription": "Sincronize seus dados para começar missões.",
  "gamification.weeklyStreak": "Sequência semanal",
  "gamification.activeMissions": "Missões ativas",
  "gamification.complete": "Concluída!",
  "gamification.dailyMissions": "Missões diárias",
  "gamification.weeklyMissions": "Missões semanais",
  "gamification.achievementLog": "Conquistas",
  "gamification.emptyDaily": "Ainda não há missões diárias",
  "gamification.emptyWeekly": "Ainda não há missões semanais",
  "gamification.emptyAchievements": "Ainda não há conquistas",
  "gamification.emptyDailyDescription":
    "Sincronize um pouco mais de atividade para liberar uma leva nova para hoje.",
  "gamification.emptyWeeklyDescription":
    "O quadro semanal vai ganhar forma quando seu ritmo de trabalho ficar mais estável.",
  "gamification.emptyAchievementsDescription":
    "Os marcos de longo prazo vão aparecer aqui quando sua raposa já tiver histórias maiores para contar.",
  "gamification.category.focus": "Foco",
  "gamification.category.consistency": "Consistência",
  "gamification.category.milestone": "Marco",
  "gamification.activate": "Ativar",
  "gamification.activeNow": "Ativa agora",
  "gamification.activeCount": ({ count, limit }) => `${count}/${limit} ativas`,
  "gamification.toastQuestActivatedTitle": "Missão ativada",
  "gamification.toastQuestActivatedDescription": ({ title }) =>
    `${title} agora está fixada no seu quadro ativo.`,
  "gamification.toastQuestActivationFailedTitle": "Não foi possível ativar a missão",
  "gamification.claimReward": "Resgatar recompensa",
  "gamification.claimed": "Resgatada",
  "gamification.toastRewardClaimedTitle": "Recompensa resgatada",
  "gamification.toastRewardClaimedDescription": ({ title }) => `${title} já entrou no seu saque.`,
  "gamification.toastAchievementUnlockedTitle": "Conquista desbloqueada",
  "gamification.toastQuestClaimFailedTitle": "Não foi possível resgatar a recompensa",
  "audit.title": "Auditoria",
  "audit.note": "Faltas e excessos.",
  "ui.close": "Fechar",
  "tray.loadingStatus": "Carregando status da bandeja...",
  "tray.dayRefreshFailed": ({ error }) => `Falha ao atualizar o dia na bandeja: ${error}`,
  "tray.refreshFailedTitle": "Falha ao atualizar a bandeja",
  "tray.logged": ({ hours }) => `${hours} registrados`,
  "tray.left": ({ hours }) => `${hours} restantes`,
  "tray.syncFailed": "A sincronização falhou",
  "tray.syncing": "Sincronizando",
  "week.target": ({ hours }) => `meta ${hours}`,
};

const enVoiceOverrides = {
  "common.loading": "Loading...",
  "common.loadingApp": "Waking up Timely",
  "sync.noEntries": "No sync notes yet. Give Timely a little data to chew on first.",
  "app.loadingWorklog": "Opening the worklog desk",
  "app.loadingPlayCenter": "Opening the fox den",
  "play.failedToLoadTitle": "The fox den would not open",
  "play.failedToLoadDescription": "The playful corner is taking a tiny nap right now.",
  "app.loadingSettings": "Unpacking settings",
  "app.loadingSetup": "Preparing your first steps",
  "app.loadingProviderSetup": "Preparing GitLab connection",
  "app.loadingScheduleSetup": "Preparing your schedule",
  "app.loadingSyncSetup": "Preparing sync",
  "app.loadingFinishScreen": "Putting on the final bow",
  "home.finishSetup":
    "Finish setting up your workspace so Timely can stop guessing and start helping.",
  "home.continueSetup": "Keep setting things up",
  "home.todayFocusNote": "The biggest time slices on your desk right now.",
  "home.cleanSlate": "Fresh desk. No crumbs yet.",
  "home.noIssuesTodayDescription": "Start logging a little time and this list will wake right up.",
  "home.momentumNote": "A quick read on the week, plus the streak keeping your fox smug.",
  "home.streakPanelNote": "Keep the chain warm and the fox pleasantly insufferable.",
  "worklog.auditFlags": "Audit flags",
  "worklog.auditFlagsDescription": "These are the bits that may want a second look in this slice.",
  "worklog.noIssuesForDayDescription": "Try another date or log a little time first.",
  "settings.motionPreferenceDescription":
    "Choose how lively Timely should feel. System follows your accessibility setting.",
  "settings.resetDataDescription":
    "Reset local data on this device, including connections, tracked entries, and preferences.",
  "settings.pullLatest": "Pull the latest from GitLab",
  "settings.autoSyncDescription": "Let Timely pull fresh GitLab data in the background.",
  "settings.showTrayIconDescription":
    "Keep Timely nearby in the system tray while it hums along in the background.",
  "settings.closeButtonActionDescription":
    "Choose whether closing the window tucks Timely into the tray or quits it fully.",
  "settings.remindersMasterDescription":
    "Friendly desktop nudges before your shift ends, so your worklog does not wander off unfinished.",
  "settings.remindersPermissionUnknown":
    "Status is still a mystery. If notices stay quiet, check Timely in your system privacy settings.",
  "settings.remindersPermissionGranted": "Allowed. Timely can tap you with desktop notices.",
  "settings.remindersPermissionDenied":
    "Blocked. Turn Timely back on in your system notification settings.",
  "settings.remindersPermissionPrompt":
    "Not decided yet. Your system may ask the next time you try.",
  "settings.remindersTestDescription": "Send one sample notice with your current reminder setup.",
  "settings.remindersTestBody": "If you can read this, the fox has permission to be helpful.",
  "settings.remindersDiagnosticsDescription":
    "Use this when reminders go weird. Refresh, clear, copy, or export the latest notes.",
  "settings.updatesOverviewTitle": "Version details",
  "settings.updatesInstalledVersionHint": "The version currently living on this device.",
  "settings.updatesReleaseChannel": "Release lane",
  "settings.updatesReleaseChannelHint": "The lane this desktop build was shipped with.",
  "settings.updatesDescription":
    "Check the latest version for your chosen update lane and install it when you are ready.",
  "settings.updatesIdleDescription": "Pick a lane, then ask Timely to look for something newer.",
  "settings.updatesToastChecking": "Looking around for a newer version on this lane.",
  "settings.updatesToastInstalling": "Downloading and lining up the selected update.",
  "settings.updatesToastRestarting": "Restarting Timely to finish the update shuffle.",
  "settings.updatesChannelHint":
    "Stable gets the calm releases. Unstable gets the brave little prereleases first.",
  "settings.updatesSummary": ({ channel }) => `Following ${channel}`,
  "settings.updatesAvailableDescription": "A newer version is waiting on this update lane.",
  "settings.updatesNoUpdate": "Nothing newer is waiting on this lane right now.",
  "settings.aboutSectionDescription":
    "Check which version and release lane this Timely build belongs to.",
  "settings.viewAppDetails": "Open app details",
  "releaseHighlights.dialogTitle": "What just changed",
  "releaseHighlights.dialogDescription": ({ version }) =>
    `Browse the freshest Timely highlights for version ${version}.`,
  "onboarding.welcomeDescription":
    "Timely is your friendly little worklog cockpit for GitLab. Let’s do a quick lap around the desk.",
  "onboarding.progressDescription":
    "This ring shows how close you are to today’s target. The more time you log, the fuller it gets.",
  "onboarding.issuesDescription":
    "Here is the list of issues that ate your day, sorted by time spent.",
  "onboarding.weekDescription":
    "This weekly view helps you spot pace, gaps, and the days where your fox definitely noticed.",
  "onboarding.worklogDescription":
    "Hop between day, week, and month views to inspect your worklog without squinting.",
  "onboarding.settingsDescription":
    "Connect GitLab here with a Personal Access Token or OAuth, then sync your real entries into Timely.",
  "onboarding.doneDescription":
    "Tour complete. Connect GitLab in Settings and let the real numbers roll in.",
  "setup.welcomeDescription": "Your playful worklog sidekick. Let’s get your desk sorted.",
  "setup.scheduleDescription": "Pick your working hours and the days that count.",
  "setup.providerDescription": "Connect GitLab so Timely knows where the work lives.",
  "setup.syncDescriptionConnected": "Pulling your GitLab worklogs into place.",
  "setup.syncDescriptionDisconnected":
    "You can sync later from Settings if you want to keep moving.",
  "setup.doneDescription": "Your workspace is ready. Time to make the fox useful.",
  "setup.connectionGuideIntro":
    "You skipped the wizard, so let’s finish the important part here: connect GitLab, then pull your data.",
  "setup.connectionGuideConnectionSection":
    "This is the spot where Timely shakes hands with GitLab. Pick the path that feels easiest, connect, then sync.",
  "setup.connectionGuidePat":
    "Access Token is the quick route. Open GitLab’s token page, create a token with read_api scope, then paste it back here.",
  "setup.connectionGuideOauthTab":
    "OAuth is the browser-first route if you would rather approve access through a GitLab app.",
  "setup.connectionGuideOauthLink":
    "This opens GitLab’s Applications page. Create an app, set the redirect URI to timely://auth/gitlab, then paste the Application ID here.",
  "setup.connectionGuideSync":
    "After either connection method works, press Sync in the top bar to pull your GitLab worklogs into Timely.",
  "play.storeTitle": "Fox den shop",
  "play.inventoryTitle": "Treasure shelf",
  "play.storeDescription": "Spend tokens on clay goodies for your fox and its cozy little den.",
  "play.storeFeatured": "Scene-stealers",
  "play.storeCompanions": "Fox lineup",
  "play.storeAccessories": "Tiny treasures",
  "play.storeFeaturedDescription": "The flashier picks with just enough drama.",
  "play.storeCompanionsDescription": "Big unlocks for your fox roster and overall vibe.",
  "play.storeAccessoriesDescription": "Small wearable bits and desk-side delights.",
  "play.storeBrowseTitle": "Browse the den shop",
  "play.storeBrowseDescription":
    "Switch sections, trim the shelf, and preview combinations before you commit your precious tokens.",
  "play.emptyStoreFilterTitle": "This shelf is suspiciously empty",
  "play.emptyStoreFilterDescription":
    "Try a different section or filter and the goodies should come back.",
  "play.clearPreview": "Clear previews",
  "play.shopRouteDescription": "See rewards, preview quickly, and buy without ceremony.",
  "play.collectionRouteDescription":
    "Everything your fox already owns, with quick equip and preview controls.",
  "play.missionsRouteDescription": "Track goals, activate favorites, and claim the shiny bits.",
  "play.achievementsRouteDescription":
    "Big milestones, longer arcs, and proof your fox has been busy.",
  "play.inventoryDescription": "Everything your fox owns and is extremely ready to show off.",
  "play.previewPanelDescription":
    "This shared preview updates from both the shop and your collection picks.",
  "play.heroAccessoriesEmpty": "No accessories on deck",
  "play.overviewDescription":
    "A quick look at your den, with easy jumps into shopping, collection, missions, and achievements.",
  "play.emptyInventoryDescription":
    "Claim rewards or buy something from the den shop to start your tiny fox museum.",
  "play.toastPurchaseDescription": ({ title }) => `${title} scampered into your collection.`,
  "play.toastEquipDescription": ({ title }) => `${title} is now part of your fox fit.`,
  "play.toastUnequipDescription": ({ title }) => `${title} is resting in storage for now.`,
  "gamification.emptyDailyDescription":
    "Daily missions will pop in once your work rhythm gets moving.",
  "gamification.emptyWeeklyDescription":
    "Weekly missions show up once Timely has enough of your rhythm to get cheeky about it.",
  "gamification.emptyAchievementsDescription":
    "Long-haul milestones appear here once your fox has earned bigger bragging rights.",
  "gamification.toastQuestActivatedDescription": ({ title }) =>
    `${title} is pinned to your active board now.`,
  "gamification.toastRewardClaimedDescription": ({ title }) =>
    `${title} is yours now and the fox is very pleased.`,
  "audit.note": "Under target, over target, and other little eyebrow raisers.",
  "tray.loadingStatus": "Loading tray snapshot...",
} satisfies Partial<MessageDictionary>;

const esVoiceOverrides = {
  "common.loading": "Cargando...",
  "common.loadingApp": "Despertando a Timely",
  "common.issues": "Incidencias",
  "common.play": "Jugar",
  "common.worklog": "Registro de trabajo",
  "sync.noEntries":
    "Todavía no hay novedades de sincronización. Dale algo para masticar a Timely primero.",
  "app.loadingWorklog": "Abriendo el escritorio del registro",
  "app.loadingPlayCenter": "Abriendo la guarida del zorro",
  "play.failedToLoadTitle": "La guarida del zorro no quiso abrir",
  "play.failedToLoadDescription": "La parte juguetona se quedó dormida un momentito.",
  "app.loadingSettings": "Desempacando Ajustes",
  "app.loadingSetup": "Preparando tus primeros pasos",
  "app.loadingProviderSetup": "Preparando la conexión con GitLab",
  "app.loadingScheduleSetup": "Preparando tu horario",
  "app.loadingSyncSetup": "Preparando la sincronización",
  "app.loadingFinishScreen": "Poniendo el moño final",
  "home.finishSetup":
    "Termina de dejar tu espacio en orden para que Timely deje de adivinar y empiece a ayudar de verdad.",
  "home.continueSetup": "Seguir con la configuración",
  "home.todayFocus": "Foco de hoy",
  "home.todayFocusNote": "Los bocados de tiempo más grandes que llevas hoy.",
  "home.cleanSlate": "Escritorio limpito. Ni una miga todavía.",
  "home.noIssuesToday": "Hoy todavía no hay incidencias registradas",
  "home.noIssuesTodayDescription": "Registra un poco de tiempo y esta lista se despierta sola.",
  "home.momentumNote":
    "Un vistazo rápido a la semana y a la racha que tiene al zorro bastante orgulloso.",
  "home.streakPanelNote": "Mantén la cadena tibia y al zorro con su aire de campeón.",
  "worklog.weeklyBreakdownNote": ({ range }) =>
    `${range}. Elige un día y abre su resumen completo.`,
  "worklog.auditFlags": "Señales de auditoría",
  "worklog.auditFlagsDescription":
    "Aquí van las cositas que quizá merecen una segunda mirada en este tramo.",
  "worklog.noIssuesForDayDescription": "Prueba con otra fecha o registra algo de tiempo primero.",
  "settings.motionPreferenceDescription":
    "Elige cuánta vida visual quieres en Timely. El modo del sistema sigue tu preferencia de accesibilidad.",
  "settings.resetDataDescription":
    "Borra los datos locales de este equipo, incluidas conexiones, horas registradas y preferencias.",
  "settings.pullLatest": "Traer lo último desde GitLab",
  "settings.autoSyncDescription":
    "Deja que Timely traiga datos frescos de GitLab en segundo plano.",
  "settings.windowBehavior": "Ventana y bandeja del sistema",
  "settings.showTrayIcon": "Mostrar icono en la bandeja del sistema",
  "settings.showTrayIconDescription":
    "Mantén Timely cerquita desde la bandeja del sistema mientras sigue funcionando en segundo plano.",
  "settings.closeButtonAction": "Al cerrar la ventana",
  "settings.closeButtonActionDescription":
    "Decide si al cerrar Timely se esconde en la bandeja del sistema o se cierra por completo.",
  "settings.closeActionMinimizeToTray": "Enviar a la bandeja del sistema",
  "settings.closeActionQuit": "Cerrar Timely",
  "settings.traySummaryCloseToTray": "Bandeja del sistema activa · al cerrar se guarda ahí",
  "settings.traySummaryKeepTray": "Bandeja del sistema activa · al cerrar se cierra Timely",
  "settings.traySummaryDisabled": "Bandeja del sistema desactivada · al cerrar se cierra Timely",
  "settings.remindersMaster": "Recordatorios de fin de jornada",
  "settings.remindersMasterDescription":
    "Avisos amistosos antes de que termine tu jornada, para que el Registro de trabajo no se quede colgando.",
  "settings.remindersPermission": "Permiso para avisos del escritorio",
  "settings.remindersPermissionUnknown":
    "El estado sigue siendo un misterio. Si no aparece nada, revisa a Timely en la privacidad del sistema.",
  "settings.remindersPermissionGranted": "Permitido. Timely ya puede tocarte el hombro con avisos.",
  "settings.remindersPermissionDenied":
    "Bloqueado. Vuelve a activar Timely en los ajustes de notificaciones del sistema.",
  "settings.remindersPermissionPrompt":
    "Todavía no está decidido. Es posible que el sistema te pregunte la próxima vez.",
  "settings.remindersRequestPermission": "Pedir permiso al sistema",
  "settings.remindersTest": "Enviar aviso de prueba",
  "settings.remindersTestDescription":
    "Lanza un aviso de muestra con la configuración que tienes ahora mismo.",
  "settings.remindersTestTitle": "Prueba de Timely",
  "settings.remindersTestBody": "Si puedes leer esto, el zorro ya tiene permiso para ayudar.",
  "settings.remindersDiagnosticsTitle": "Consola de diagnóstico",
  "settings.remindersDiagnosticsDescription":
    "Úsala cuando los recordatorios se pongan raros. Puedes refrescar, limpiar, copiar o exportar las últimas notas.",
  "settings.updates": "Actualizaciones",
  "settings.updatesOverviewTitle": "Detalles de la versión",
  "settings.updatesInstalledVersionHint": "La versión que vive ahora mismo en este equipo.",
  "settings.updatesReleaseChannel": "Canal de actualizaciones",
  "settings.updatesReleaseChannelHint":
    "El canal con el que se entregó esta versión de escritorio.",
  "settings.updatesDescription":
    "Busca la versión más reciente del canal que elijas e instálala cuando te venga bien.",
  "settings.updatesIdleDescription": "Elige un canal y deja que Timely mire si hay algo más nuevo.",
  "settings.updatesToastChecking": "Buscando una versión más reciente en el canal elegido.",
  "settings.updatesToastInstalling": "Descargando y acomodando la actualización seleccionada.",
  "settings.updatesToastRestarting":
    "Reiniciando Timely para terminar de aplicar la actualización.",
  "settings.updatesChannelHint":
    "Estable recibe las versiones tranquilas. Inestable recibe antes las versiones preliminares.",
  "settings.updatesSummary": ({ channel }) => `Siguiendo ${channel}`,
  "settings.updatesAvailableDescription": "Hay una versión más reciente esperándote en este canal.",
  "settings.updatesNoUpdate":
    "Ahora mismo no hay una versión más reciente esperándote en este canal.",
  "settings.aboutSectionDescription":
    "Mira qué versión y qué canal de actualizaciones usa este Timely.",
  "settings.viewAppDetails": "Abrir detalles de la aplicación",
  "releaseHighlights.dialogTitle": "Qué cambió ahora",
  "releaseHighlights.dialogDescription": ({ version }) =>
    `Mira las novedades más frescas de Timely en la versión ${version}.`,
  "onboarding.welcomeDescription":
    "Timely es tu pequeño centro de mando para el Registro de trabajo en GitLab. Demos una vuelta rápida.",
  "onboarding.progressDescription":
    "Este aro te muestra cuánto te falta para la meta de hoy. Cuanto más registras, más se llena.",
  "onboarding.issuesDescription":
    "Aquí ves qué incidencias se comieron tu día, ordenadas por tiempo registrado.",
  "onboarding.weekDescription":
    "Esta vista semanal te ayuda a pillar el ritmo, los huecos y esos días en que el zorro claramente tomó nota.",
  "onboarding.worklogDescription":
    "Salta entre día, semana y mes para revisar tu Registro de trabajo sin pelearte con la pantalla.",
  "onboarding.settingsDescription":
    "Aquí conectas GitLab con un token personal o con OAuth y luego sincronizas tus horas reales.",
  "onboarding.doneDescription":
    "Tour listo. Conecta GitLab en Ajustes y deja que entren los números de verdad.",
  "setup.welcomeDescription":
    "Tu compañero juguetón para el Registro de trabajo. Vamos a dejarte el escritorio en orden.",
  "setup.scheduleDescription": "Elige tus horas de trabajo y los días que sí cuentan.",
  "setup.providerDescription": "Conecta GitLab para que Timely sepa dónde vive el trabajo.",
  "setup.syncDescriptionConnected": "Trayendo tus registros de GitLab a su sitio.",
  "setup.syncDescriptionDisconnected":
    "Si quieres seguir ahora, puedes sincronizar más tarde desde Ajustes.",
  "setup.doneDescription": "Tu espacio ya está listo. Hora de volver útil a ese zorro.",
  "setup.connectionGuideTitle": "Termina la conexión con GitLab",
  "setup.connectionGuideIntro":
    "Saltaste el asistente, así que vamos directo a lo importante: conecta GitLab y luego trae tus datos.",
  "setup.connectionGuideConnectionSection":
    "Aquí es donde Timely le da la mano a GitLab. Elige el camino más cómodo, conecta y luego sincroniza.",
  "setup.connectionGuidePat":
    "La vía rápida es usar un token de acceso. Abre la página de tokens de GitLab, crea uno con permiso read_api y pégalo aquí.",
  "setup.connectionGuideOauthTab":
    "OAuth es la ruta desde el navegador si prefieres autorizar el acceso mediante una aplicación de GitLab.",
  "setup.connectionGuideOauthLink":
    "Esto abre la página de aplicaciones de GitLab. Crea una aplicación, usa timely://auth/gitlab como URI de redirección y pega aquí el ID de la aplicación.",
  "setup.connectionGuideSync":
    "Cuando cualquiera de los dos métodos funcione, pulsa Sincronizar en la barra superior para traer tu Registro de trabajo a Timely.",
  "play.storeTitle": "Tienda de la guarida",
  "play.inventoryTitle": "Estante del botín",
  "play.storeDescription":
    "Gasta fichas en caprichos de arcilla para tu zorro y su guarida acogedora.",
  "play.storeFeatured": "Los que se roban la escena",
  "play.storeCompanions": "Plantel de zorros",
  "play.storeAccessories": "Tesoritos",
  "play.storeFeaturedDescription": "Las piezas con más brillo y un poquito de teatro.",
  "play.storeCompanionsDescription": "Grandes desbloqueos para tu pandilla de zorros y su estilo.",
  "play.storeAccessoriesDescription": "Detalles pequeños, ponibles y bastante presumidos.",
  "play.storeBrowseTitle": "Explora la tienda de la guarida",
  "play.storeBrowseDescription":
    "Cambia de sección, afina el estante y prueba combinaciones antes de gastar tus fichas.",
  "play.emptyStoreFilterTitle": "Este estante quedó sospechosamente vacío",
  "play.emptyStoreFilterDescription":
    "Prueba otra sección o filtro y deberían volver a aparecer las cositas buenas.",
  "play.clearPreview": "Limpiar vistas previas",
  "play.shopRouteDescription": "Mira recompensas, pruébalas rápido y compra sin rodeos.",
  "play.collectionRouteDescription":
    "Todo lo que tu zorro ya tiene, con controles rápidos para equipar y previsualizar.",
  "play.missionsRouteDescription": "Sigue metas, activa tus favoritas y cobra lo brillante.",
  "play.achievementsRouteDescription":
    "Metas grandes, progreso a largo plazo y pruebas de que tu zorro no ha estado vagueando.",
  "play.inventoryDescription": "Todo lo que tu zorro ya posee y está deseando presumir un poquito.",
  "play.previewPanelDescription":
    "Esta vista previa compartida se actualiza tanto desde la tienda como desde tu colección.",
  "play.heroAccessoriesEmpty": "No hay accesorios en escena",
  "play.overviewDescription":
    "Un vistazo rápido a tu guarida, con saltos fáciles a tienda, colección, misiones y logros.",
  "play.emptyInventoryDescription":
    "Consigue recompensas o compra algo en la tienda para empezar tu mini museo zorruno.",
  "play.toastPurchaseDescription": ({ title }) => `${title} salió corriendo hacia tu colección.`,
  "play.toastEquipDescription": ({ title }) => `${title} ya forma parte del look de tu zorro.`,
  "play.toastUnequipDescription": ({ title }) => `${title} vuelve al almacén por un rato.`,
  "gamification.emptyDailyDescription":
    "Las misiones diarias aparecerán cuando tu ritmo de trabajo se ponga en marcha.",
  "gamification.emptyWeeklyDescription":
    "Las misiones semanales salen cuando Timely ya entiende tu ritmo y se anima a opinar.",
  "gamification.emptyAchievementsDescription":
    "Los logros largos aparecerán aquí cuando tu zorro tenga historias más grandes que contar.",
  "gamification.toastQuestActivatedDescription": ({ title }) =>
    `${title} ya quedó fijada en tu tablero activo.`,
  "gamification.toastRewardClaimedDescription": ({ title }) =>
    `${title} ya es tuya y el zorro está bastante contento con el asunto.`,
  "audit.note": "Lo que quedó corto, lo que se pasó y otras cejas levantadas.",
  "tray.loadingStatus": "Cargando el resumen de la bandeja...",
} satisfies Partial<MessageDictionary>;

const ptVoiceOverrides = {
  "common.loading": "Carregando...",
  "common.loadingApp": "Acordando o Timely",
  "common.play": "Brincar",
  "common.worklog": "Registro de trabalho",
  "sync.noEntries":
    "Ainda não há novidades de sincronização. Primeiro dê um pouco de trabalho para o Timely mastigar.",
  "app.loadingWorklog": "Abrindo a mesa do registro",
  "app.loadingPlayCenter": "Abrindo a toca da raposa",
  "play.failedToLoadTitle": "A toca da raposa não quis abrir",
  "play.failedToLoadDescription": "A parte brincalhona tirou um cochilo rapidinho.",
  "app.loadingSettings": "Desembrulhando Configurações",
  "app.loadingSetup": "Preparando seus primeiros passos",
  "app.loadingProviderSetup": "Preparando a conexão com o GitLab",
  "app.loadingScheduleSetup": "Preparando sua rotina",
  "app.loadingSyncSetup": "Preparando a sincronização",
  "app.loadingFinishScreen": "Colocando o laço final",
  "home.finishSetup":
    "Termine de arrumar seu espaço para o Timely parar de adivinhar e começar a ajudar de verdade.",
  "home.continueSetup": "Seguir com a configuração",
  "home.todayFocus": "Foco de hoje",
  "home.todayFocusNote": "Os maiores pedaços de tempo na sua mesa até agora.",
  "home.cleanSlate": "Mesa limpinha. Nem migalha ainda.",
  "home.noIssuesToday": "Ainda não há itens registrados hoje",
  "home.noIssuesTodayDescription": "Registre um pouco de tempo e essa lista acorda na hora.",
  "home.momentumNote":
    "Um pulso rápido da semana e da sequência que está deixando a raposa toda convencida.",
  "home.streakPanelNote": "Mantenha a corrente aquecida e a raposa agradavelmente metida.",
  "worklog.weeklyBreakdownNote": ({ range }) =>
    `${range}. Escolha um dia para abrir o resumo completo.`,
  "worklog.auditFlags": "Sinais de auditoria",
  "worklog.auditFlagsDescription":
    "Aqui ficam os pedacinhos que talvez mereçam uma segunda olhada neste trecho.",
  "worklog.noIssuesForDayDescription": "Tente outra data ou registre um pouco de tempo primeiro.",
  "settings.motionPreferenceDescription":
    "Escolha quanta vida visual o Timely deve ter. O modo do sistema segue sua preferência de acessibilidade.",
  "settings.resetDataDescription":
    "Apaga os dados locais deste dispositivo, incluindo conexões, horas registradas e preferências.",
  "settings.pullLatest": "Trazer o mais recente do GitLab",
  "settings.autoSyncDescription": "Deixe o Timely buscar dados novos do GitLab em segundo plano.",
  "settings.windowBehavior": "Janela e bandeja do sistema",
  "settings.showTrayIcon": "Mostrar ícone na bandeja do sistema",
  "settings.showTrayIconDescription":
    "Mantém o Timely por perto na bandeja do sistema enquanto ele segue trabalhando em segundo plano.",
  "settings.closeButtonAction": "Ao fechar a janela",
  "settings.closeButtonActionDescription":
    "Escolha se fechar a janela manda o Timely para a bandeja do sistema ou encerra tudo de vez.",
  "settings.closeActionMinimizeToTray": "Mandar para a bandeja do sistema",
  "settings.closeActionQuit": "Fechar o Timely",
  "settings.traySummaryCloseToTray": "Bandeja do sistema ativada · ao fechar vai para lá",
  "settings.traySummaryKeepTray": "Bandeja do sistema ativada · ao fechar encerra o Timely",
  "settings.traySummaryDisabled": "Bandeja do sistema desativada · ao fechar encerra o Timely",
  "settings.remindersMaster": "Lembretes de fim de expediente",
  "settings.remindersMasterDescription":
    "Avisos simpáticos antes do expediente acabar, para o Registro de trabalho não ficar largado pela metade.",
  "settings.remindersPermission": "Permissão para avisos na área de trabalho",
  "settings.remindersPermissionUnknown":
    "O estado ainda é um mistério. Se nada aparecer, confira o Timely nas opções de privacidade do sistema.",
  "settings.remindersPermissionGranted": "Permitido. O Timely já pode dar seu cutucão com avisos.",
  "settings.remindersPermissionDenied":
    "Bloqueado. Ative o Timely de novo nas configurações de notificações do sistema.",
  "settings.remindersPermissionPrompt":
    "Ainda não foi decidido. O sistema pode perguntar na próxima tentativa.",
  "settings.remindersRequestPermission": "Pedir permissão ao sistema",
  "settings.remindersTest": "Enviar aviso de teste",
  "settings.remindersTestDescription": "Manda um aviso de exemplo usando a configuração atual.",
  "settings.remindersTestTitle": "Teste do Timely",
  "settings.remindersTestBody": "Se você consegue ler isto, a raposa já tem permissão para ajudar.",
  "settings.remindersDiagnosticsTitle": "Console de diagnóstico",
  "settings.remindersDiagnosticsDescription":
    "Use isto quando os lembretes ficarem esquisitos. Dá para atualizar, limpar, copiar ou exportar as últimas anotações.",
  "settings.updates": "Atualizações",
  "settings.updatesOverviewTitle": "Detalhes da versão",
  "settings.updatesInstalledVersionHint": "A versão que está morando neste dispositivo agora.",
  "settings.updatesReleaseChannel": "Canal de atualizações",
  "settings.updatesReleaseChannelHint": "O canal com que esta versão de desktop foi entregue.",
  "settings.updatesDescription":
    "Procure a versão mais recente do canal escolhido e instale quando quiser.",
  "settings.updatesIdleDescription":
    "Escolha um canal e deixe o Timely ver se existe algo mais novo.",
  "settings.updatesToastChecking": "Procurando uma versão mais nova no canal escolhido.",
  "settings.updatesToastInstalling": "Baixando e ajeitando a atualização selecionada.",
  "settings.updatesToastRestarting": "Reiniciando o Timely para terminar a atualização.",
  "settings.updatesChannelHint":
    "Estável recebe as versões mais tranquilas. Instável recebe primeiro as versões preliminares.",
  "settings.updatesSummary": ({ channel }) => `Seguindo ${channel}`,
  "settings.updatesAvailableDescription": "Há uma versão mais nova esperando neste canal.",
  "settings.updatesNoUpdate": "Por enquanto não há nada mais novo esperando neste canal.",
  "settings.aboutSectionDescription":
    "Veja qual versão e qual canal de atualizações este Timely está usando.",
  "settings.viewAppDetails": "Abrir detalhes do aplicativo",
  "releaseHighlights.dialogTitle": "O que mudou agora",
  "releaseHighlights.dialogDescription": ({ version }) =>
    `Veja as novidades mais frescas do Timely na versão ${version}.`,
  "onboarding.welcomeDescription":
    "O Timely é seu cantinho de comando para o Registro de trabalho no GitLab. Vamos dar uma volta rápida.",
  "onboarding.progressDescription":
    "Este anel mostra o quanto falta para a meta de hoje. Quanto mais tempo você registra, mais ele se completa.",
  "onboarding.issuesDescription":
    "Aqui você vê quais itens mastigaram o seu dia, ordenados pelo tempo registrado.",
  "onboarding.weekDescription":
    "Esta visão semanal ajuda a enxergar ritmo, buracos e aqueles dias em que a raposa claramente percebeu tudo.",
  "onboarding.worklogDescription":
    "Pule entre dia, semana e mês para examinar o Registro de trabalho sem brigar com a interface.",
  "onboarding.settingsDescription":
    "Conecte o GitLab aqui com um token pessoal ou com OAuth e depois sincronize seus registros reais.",
  "onboarding.doneDescription":
    "Passeio concluído. Conecte o GitLab em Configurações e deixe os números reais entrarem.",
  "setup.welcomeDescription":
    "Seu companheiro brincalhão para o Registro de trabalho. Vamos deixar sua mesa em ordem.",
  "setup.scheduleDescription": "Escolha seu horário e os dias que realmente contam.",
  "setup.providerDescription": "Conecte o GitLab para o Timely saber onde o trabalho mora.",
  "setup.syncDescriptionConnected": "Trazendo seus registros do GitLab para o lugar certo.",
  "setup.syncDescriptionDisconnected":
    "Se quiser seguir agora, você pode sincronizar depois em Configurações.",
  "setup.doneDescription": "Seu espaço já está pronto. Hora de deixar essa raposa útil.",
  "setup.connectionGuideTitle": "Conclua a conexão com o GitLab",
  "setup.connectionGuideIntro":
    "Você pulou o assistente, então vamos direto ao que importa: conectar o GitLab e puxar seus dados.",
  "setup.connectionGuideConnectionSection":
    "É aqui que o Timely aperta a mão do GitLab. Escolha o caminho mais confortável, conecte e depois sincronize.",
  "setup.connectionGuidePat":
    "A rota mais rápida é usar um token de acesso. Abra a página de tokens do GitLab, crie um token com escopo read_api e cole aqui.",
  "setup.connectionGuideOauthTab":
    "OAuth é a rota pelo navegador para quem prefere autorizar o acesso usando um aplicativo do GitLab.",
  "setup.connectionGuideOauthLink":
    "Isto abre a página de aplicativos do GitLab. Crie um aplicativo, use timely://auth/gitlab como URI de redirecionamento e cole aqui o ID do aplicativo.",
  "setup.connectionGuideSync":
    "Quando qualquer um dos métodos funcionar, clique em Sincronizar na barra superior para trazer seu Registro de trabalho para o Timely.",
  "play.storeTitle": "Loja da toca",
  "play.inventoryTitle": "Prateleira do tesouro",
  "play.storeDescription":
    "Gaste fichas com mimos de argila para sua raposa e a toca aconchegante dela.",
  "play.storeFeatured": "Os roubadores de cena",
  "play.storeCompanions": "Time de raposas",
  "play.storeAccessories": "Tesourinhos",
  "play.storeFeaturedDescription": "As peças mais chamativas, com a dose certa de teatro.",
  "play.storeCompanionsDescription":
    "Grandes desbloqueios para sua turma de raposas e para o clima da toca.",
  "play.storeAccessoriesDescription": "Detalhes pequenos, usáveis e muito exibidos.",
  "play.storeBrowseTitle": "Explore a loja da toca",
  "play.storeBrowseDescription":
    "Troque de seção, afine a prateleira e teste combinações antes de gastar suas fichas.",
  "play.emptyStoreFilterTitle": "Esta prateleira ficou misteriosamente vazia",
  "play.emptyStoreFilterDescription":
    "Experimente outra seção ou outro filtro que as coisinhas boas aparecem de novo.",
  "play.clearPreview": "Limpar prévias",
  "play.shopRouteDescription": "Veja recompensas, faça prévias rápidas e compre sem cerimônia.",
  "play.collectionRouteDescription":
    "Tudo o que sua raposa já possui, com controles rápidos para equipar e visualizar.",
  "play.missionsRouteDescription":
    "Acompanhe metas, ative favoritas e resgate as partes brilhantes.",
  "play.achievementsRouteDescription":
    "Metas grandes, progresso longo e provas de que sua raposa não ficou à toa.",
  "play.inventoryDescription":
    "Tudo o que sua raposa já tem e está doida para exibir um pouquinho.",
  "play.previewPanelDescription":
    "Esta prévia compartilhada se atualiza a partir da loja e da coleção.",
  "play.heroAccessoriesEmpty": "Nenhum acessório em cena",
  "play.overviewDescription":
    "Uma olhada rápida na sua toca, com atalhos para loja, coleção, missões e conquistas.",
  "play.emptyInventoryDescription":
    "Ganhe recompensas ou compre algo na loja para começar seu mini museu de raposa.",
  "play.toastPurchaseDescription": ({ title }) => `${title} correu para a sua coleção.`,
  "play.toastEquipDescription": ({ title }) => `${title} agora faz parte do visual da sua raposa.`,
  "play.toastUnequipDescription": ({ title }) => `${title} foi descansar no estoque por enquanto.`,
  "gamification.emptyDailyDescription":
    "As missões diárias aparecem quando seu ritmo de trabalho começa a andar.",
  "gamification.emptyWeeklyDescription":
    "As missões semanais surgem quando o Timely já entende seu ritmo e resolve dar palpite.",
  "gamification.emptyAchievementsDescription":
    "As conquistas longas aparecem aqui quando sua raposa tiver histórias maiores para contar.",
  "gamification.toastQuestActivatedDescription": ({ title }) =>
    `${title} agora está fixada no seu painel ativo.`,
  "gamification.toastRewardClaimedDescription": ({ title }) =>
    `${title} agora é sua e a raposa ficou bem satisfeita com isso.`,
  "audit.note": "O que ficou abaixo, o que passou e outras sobrancelhas levantadas.",
  "tray.loadingStatus": "Carregando o resumo da bandeja...",
} satisfies Partial<MessageDictionary>;

const messagesByLocale: Record<SupportedLocale, MessageDictionary> = {
  en: { ...enMessages, ...enVoiceOverrides },
  es: { ...esMessages, ...esVoiceOverrides },
  pt: { ...ptMessages, ...ptVoiceOverrides },
};

export const localeMessages = messagesByLocale;

function interpolate(template: string, params: TranslationParams): string {
  return template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

function resolveMessage(
  locale: SupportedLocale,
  key: MessageKey,
  params: TranslationParams = {},
): string {
  const value = messagesByLocale[locale][key] ?? enMessages[key];
  if (value == null) {
    return key;
  }
  if (typeof value === "function") {
    return value(params);
  }
  return interpolate(value, params);
}

export function normalizeLanguagePreference(value?: string | null): LanguagePreference {
  if (value === "auto") return "auto";
  const normalized = normalizeSupportedLocale(value);
  return normalized ?? "auto";
}

export function resolveLocale(
  preference: LanguagePreference,
  browserLanguages: readonly string[] = getBrowserLanguages(),
): SupportedLocale {
  if (preference !== "auto") {
    return preference;
  }

  for (const language of browserLanguages) {
    const normalized = normalizeSupportedLocale(language);
    if (normalized) {
      return normalized;
    }
  }

  return "en";
}

function normalizeSupportedLocale(value?: string | null): SupportedLocale | null {
  if (!value) return null;
  const base = value.toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(base as SupportedLocale) ? (base as SupportedLocale) : null;
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") {
    return ["en"];
  }

  if (navigator.languages.length > 0) {
    return navigator.languages;
  }

  return [navigator.language];
}

function formatDateWithLocale(
  locale: SupportedLocale,
  date: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function formatDateRangeWithLocale(
  locale: SupportedLocale,
  start: Date,
  end: Date,
  options: Intl.DateTimeFormatOptions,
) {
  const formatter = new Intl.DateTimeFormat(locale, options);
  const maybeRangeFormatter = formatter as Intl.DateTimeFormat & {
    formatRange?: (startDate: Date, endDate: Date) => string;
  };
  return (
    maybeRangeFormatter.formatRange?.(start, end) ??
    `${formatter.format(start)} - ${formatter.format(end)}`
  );
}

function formatRelativeTimeWithLocale(locale: SupportedLocale, date: Date | null) {
  if (!date) {
    return resolveMessage(locale, "common.never");
  }

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const seconds = Math.round(diffMs / 1000);

  if (Math.abs(seconds) < 45) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
  }

  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
}

function formatHoursWithLocale(
  locale: SupportedLocale,
  value: number,
  translate: (key: MessageKey, params?: TranslationParams) => string,
  format: TimeFormat = "hm",
) {
  if (format === "decimal") {
    const number = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
    return `${number}${translate("common.hoursShort")}`;
  }

  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}${translate("common.hoursShort")}`;
  }

  return `${hours}${translate("common.hoursShort")}${minutes}${translate("common.minutesShort")}`;
}

const WEEKDAY_INDEX_BY_CODE = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
} as const;

const dayStatusKeyByValue: Record<DayStatus, MessageKey> = {
  empty: "common.status.empty",
  under_target: "common.status.underTarget",
  on_track: "common.status.onTrack",
  met_target: "common.status.metTarget",
  over_target: "common.status.overTarget",
  non_workday: "common.status.nonWorkday",
};

const auditSeverityKeyByValue = {
  high: "common.severity.high",
  medium: "common.severity.medium",
  low: "common.severity.low",
} as const;

function buildDefaultValue(): I18nContextValue {
  const locale: SupportedLocale = "en";
  const t = (key: MessageKey, params?: TranslationParams) => resolveMessage(locale, key, params);

  return {
    languagePreference: "auto",
    locale,
    setLanguagePreference: () => {},
    t,
    formatDate: (date, options) => formatDateWithLocale(locale, date, options),
    formatDateShort: (date) =>
      formatDateWithLocale(locale, date, { month: "short", day: "numeric" }),
    formatDateLong: (date) =>
      formatDateWithLocale(locale, date, { weekday: "long", month: "long", day: "numeric" }),
    formatDateRange: (start, end, options) =>
      formatDateRangeWithLocale(locale, start, end, options ?? { month: "short", day: "numeric" }),
    formatRelativeTime: (date) => formatRelativeTimeWithLocale(locale, date),
    formatWeekdayFromCode: (code, style = "short") =>
      formatWeekdayFromCodeWithLocale(locale, code, style),
    formatWeekdayFromDate: (date, style = "short") =>
      formatDateWithLocale(locale, date, { weekday: style }),
    formatMonthDayWeekday: (date) =>
      formatDateWithLocale(locale, date, { month: "short", day: "numeric", weekday: "short" }),
    formatTimezoneOffset: (timezone) =>
      new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? "GMT",
    formatHours: (value, format) => formatHoursWithLocale(locale, value, t, format),
    formatDayStatus: (status) => t(dayStatusKeyByValue[status]),
    formatAuditSeverity: (severity) => t(auditSeverityKeyByValue[severity]),
    formatLanguageLabel: (value) => formatLanguageLabelWithTranslate(t, value),
  };
}

function formatWeekdayFromCodeWithLocale(
  locale: SupportedLocale,
  code: keyof typeof WEEKDAY_INDEX_BY_CODE,
  style: WeekdayFormatStyle,
) {
  const sundayReference = new Date(Date.UTC(2024, 0, 7 + WEEKDAY_INDEX_BY_CODE[code]));
  return formatDateWithLocale(locale, sundayReference, { weekday: style, timeZone: "UTC" });
}

function formatLanguageLabelWithTranslate(
  t: (key: MessageKey, params?: TranslationParams) => string,
  value: LanguagePreference,
) {
  if (value === "auto") return t("common.auto");
  if (value === "es") return t("common.spanish");
  if (value === "pt") return t("common.portuguese");
  return t("common.english");
}

export interface I18nContextValue {
  languagePreference: LanguagePreference;
  locale: SupportedLocale;
  setLanguagePreference: (value: LanguagePreference) => void;
  t: (key: MessageKey, params?: TranslationParams) => string;
  formatDate: (date: Date, options: Intl.DateTimeFormatOptions) => string;
  formatDateShort: (date: Date) => string;
  formatDateLong: (date: Date) => string;
  formatDateRange: (start: Date, end: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (date: Date | null) => string;
  formatWeekdayFromCode: (
    code: keyof typeof WEEKDAY_INDEX_BY_CODE,
    style?: WeekdayFormatStyle,
  ) => string;
  formatWeekdayFromDate: (date: Date, style?: WeekdayFormatStyle) => string;
  formatMonthDayWeekday: (date: Date) => string;
  formatTimezoneOffset: (timezone: string) => string;
  formatHours: (value: number, format?: TimeFormat) => string;
  formatDayStatus: (status: DayStatus) => string;
  formatAuditSeverity: (severity: "high" | "medium" | "low") => string;
  formatLanguageLabel: (value: LanguagePreference) => string;
}

const I18nContext = createContext<I18nContextValue>(buildDefaultValue());

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>("auto");
  const locale = useMemo(() => resolveLocale(languagePreference), [languagePreference]);

  useEffect(() => {
    let cancelled = false;

    void getAppPreferencesCached()
      .then((preferences) => {
        if (!cancelled) {
          setLanguagePreference(normalizeLanguagePreference(preferences.language));
        }
      })
      .catch(() => {
        // Best effort; fallback remains auto/system
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;

    void listenAppPreferencesChanged((preferences) => {
      if (!active) {
        return;
      }

      setLanguagePreference(normalizeLanguagePreference(preferences.language));
    })
      .then((cleanup) => {
        if (!active) {
          cleanup();
          return;
        }

        unlisten = cleanup;
      })
      .catch(() => {
        // Best effort desktop sync only
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: TranslationParams) => resolveMessage(locale, key, params),
    [locale],
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      languagePreference,
      locale,
      setLanguagePreference,
      t,
      formatDate: (date, options) => formatDateWithLocale(locale, date, options),
      formatDateShort: (date) =>
        formatDateWithLocale(locale, date, { month: "short", day: "numeric" }),
      formatDateLong: (date) =>
        formatDateWithLocale(locale, date, { weekday: "long", month: "long", day: "numeric" }),
      formatDateRange: (start, end, options) =>
        formatDateRangeWithLocale(
          locale,
          start,
          end,
          options ?? { month: "short", day: "numeric" },
        ),
      formatRelativeTime: (date) => formatRelativeTimeWithLocale(locale, date),
      formatWeekdayFromCode: (code, style = "short") =>
        formatWeekdayFromCodeWithLocale(locale, code, style),
      formatWeekdayFromDate: (date, style = "short") =>
        formatDateWithLocale(locale, date, { weekday: style }),
      formatMonthDayWeekday: (date) =>
        formatDateWithLocale(locale, date, { month: "short", day: "numeric", weekday: "short" }),
      formatTimezoneOffset: (timezone) =>
        new Intl.DateTimeFormat(locale, { timeZone: timezone, timeZoneName: "shortOffset" })
          .formatToParts(new Date())
          .find((part) => part.type === "timeZoneName")?.value ?? "GMT",
      formatHours: (amount, format) => formatHoursWithLocale(locale, amount, t, format),
      formatDayStatus: (status) => t(dayStatusKeyByValue[status]),
      formatAuditSeverity: (severity) => t(auditSeverityKeyByValue[severity]),
      formatLanguageLabel: (language) => formatLanguageLabelWithTranslate(t, language),
    }),
    [languagePreference, locale, t],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function renderTranslation(
  locale: SupportedLocale,
  key: MessageKey,
  params?: TranslationParams,
) {
  return resolveMessage(locale, key, params);
}
