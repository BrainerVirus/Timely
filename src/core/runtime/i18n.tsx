import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAppPreferencesCached } from "@/core/runtime/preferences-cache";
import { listenAppPreferencesChanged } from "@/core/runtime/tauri";

import type { DayStatus, LanguagePreference, SupportedLocale, TimeFormat } from "@/shared/types/dashboard";

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
  "common.english": "English",
  "common.spanish": "Spanish",
  "common.portuguese": "Portuguese",
  "common.hoursShort": "h",
  "common.minutesShort": "min",
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
  "settings.saveSchedule": "Save schedule",
  "settings.savingSchedule": "Saving changes...",
  "settings.scheduleSaved": "Schedule saved",
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
  "settings.accessibilitySummary": ({ language, mode }) =>
    `Language: ${language} · Motion: ${mode}`,
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
  "common.english": "Inglés",
  "common.spanish": "Español",
  "common.portuguese": "Portugués",
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
  "settings.saveSchedule": "Guardar horario",
  "settings.savingSchedule": "Guardando cambios...",
  "settings.scheduleSaved": "Horario guardado",
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
  "settings.accessibilitySummary": ({ language, mode }) =>
    `Idioma: ${language} · Movimiento: ${mode}`,
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
  "common.english": "Inglês",
  "common.spanish": "Espanhol",
  "common.portuguese": "Português",
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
  "settings.saveSchedule": "Salvar agenda",
  "settings.savingSchedule": "Salvando alterações...",
  "settings.scheduleSaved": "Agenda salva",
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
  "settings.accessibilitySummary": ({ language, mode }) =>
    `Idioma: ${language} · Movimento: ${mode}`,
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

const messagesByLocale: Record<SupportedLocale, MessageDictionary> = {
  en: enMessages,
  es: esMessages,
  pt: ptMessages,
};

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

interface I18nContextValue {
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
