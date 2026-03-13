import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadAppPreferences } from "@/lib/tauri";
import type { DayStatus, LanguagePreference, SupportedLocale, TimeFormat } from "@/types/dashboard";

type TranslationPrimitive = string | number | boolean | null | undefined;
type TranslationParams = Record<string, TranslationPrimitive>;
type MessageValue = string | ((params: TranslationParams) => string);

const SUPPORTED_LOCALES = ["en", "es", "pt"] as const satisfies readonly SupportedLocale[];

const enMessages = {
  "app.name": "Timely",
  "common.auto": "Auto (System)",
  "common.back": "Back",
  "common.calendar": "Calendar",
  "common.continue": "Continue",
  "common.day": "Day",
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
  "home.petMoodFocused": "Focused",
  "home.petMoodHappy": "Happy",
  "home.petMoodExcited": "Excited",
  "home.petMetricStreak": "Streak",
  "home.petMetricFocus": "Focus",
  "home.petMetricRhythm": "Rhythm",
  "home.weeklyProgressTitle": "This week's progress",
  "home.weeklyProgressNote": "Logged hours against each workday target.",
  "home.streakPanelTitle": "Current streak",
  "home.streakPanelNote": "Keep the chain alive and let the week stay warm.",
  "home.weeklyPulse": "Weekly pulse",
  "home.thisWeek": "This week",
  "home.weeklyRhythmEmpty": "Sync your data to see your weekly rhythm appear here.",
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
  "home.headlineWarmupA": ({ alias }) => `A fresh page is waiting, [[${alias}]].`,
  "home.headlineWarmupB": ({ alias }) => `The board is clear, [[${alias}]]. Time to start the rhythm.`,
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
  "worklog.weeklyBreakdown": "Weekly breakdown",
  "worklog.weeklyBreakdownNote": ({ range }) => `${range}. Pick a day to open its full summary.`,
  "worklog.weekSummary": "Week summary",
  "worklog.periodSummary": "Period summary",
  "worklog.selectedRange": ({ range }) => `Selected range: ${range}`,
  "worklog.daySummary": "Day summary",
  "worklog.weekOf": ({ date }) => `Week of ${date}`,
  "worklog.backTo": ({ parent }) => `Back to ${parent}`,
  "worklog.auditFlags": "Audit Flags",
  "worklog.auditFlagsDescription": "Review the items that may need attention for this selected slice.",
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
  "dashboard.weekTitle": "Week",
  "dashboard.weekNote": "Hours across the current week.",
  "dashboard.loggedTime": "Logged time",
  "dashboard.loggedAcrossRange": "Across this range",
  "dashboard.targetTime": "Target time",
  "dashboard.expectedLoad": "Planned for this range",
  "dashboard.cleanDays": "Days within target",
  "dashboard.overflowCount": ({ count }) => `${count} ${Number(count) === 1 ? "day" : "days"} over target`,
  "dashboard.dailyBreakdown": "Daily breakdown",
  "dashboard.pickDayToOpen": "Pick a day to open its full summary.",
  "settings.connection": "Connection",
  "settings.providerSync": "Provider sync",
  "settings.connectedTo": ({ host }) => `Connected to ${host}`,
  "settings.notConnected": "Not connected",
  "settings.schedule": "Schedule",
  "settings.calendarAndHolidays": "Calendar & Holidays",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.timeFormat": "Time format",
  "settings.hoursAndMinutes": "Hours & minutes",
  "settings.decimal": "Decimal",
  "settings.durationHint": "Controls how durations are shown across the entire app.",
  "settings.hoursPerDaySummary": ({ hours }) => `${hours}h/day`,
  "settings.sync": "Sync",
  "settings.dataManagement": "Data Management",
  "settings.resetDataDescription": "Reset all local data including connections, time entries, and settings.",
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
  "settings.themeSummary": ({ theme, timeFormat }) => `Theme: ${theme} · Time: ${timeFormat}`,
  "settings.failedHolidayPreferences": "Failed to save holiday preferences",
  "settings.failedSchedule": "Failed to save schedule",
  "settings.tryAgain": "Please try again.",
  "settings.system": "System",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.languageSummary": ({ language }) => `Language: ${language}`,
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
  "providers.oauthScopes": "with scopes read_api and read_user. Set the redirect URI to timely://auth/gitlab",
  "providers.waitingForAuthorization": "Waiting for GitLab authorization...",
  "providers.completeSignIn": "Complete the sign-in in the auth window. The app will detect the callback automatically.",
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
  "onboarding.welcomeDescription":
    "Your personal time-tracking dashboard that syncs with GitLab. We've loaded sample data so you can explore. Let's take a quick tour!",
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
  "setup.openTimely": "Open Timely",
  "setup.continueButton": "Continue",
  "play.feeling": ({ mood }) => `Feeling ${mood}`,
  "play.level": "Level",
  "play.xp": "XP",
  "play.streak": "Streak",
  "play.tokens": "Tokens",
  "play.noActiveQuests": "No active quests",
  "play.noActiveQuestsDescription": "Sync your data to start missions.",
  "gamification.weeklyStreak": "Weekly streak",
  "gamification.activeMissions": "Active missions",
  "gamification.complete": "Complete!",
  "audit.title": "Audit",
  "audit.note": "Underfills and overages.",
  "ui.close": "Close",
  "tray.loadingStatus": "Loading tray status...",
  "tray.logged": ({ hours }) => `${hours} logged`,
  "tray.left": ({ hours }) => `${hours} left`,
  "tray.syncFailedRetry": "Sync failed - try again",
  "tray.syncing": "Syncing",
  "week.target": ({ hours }) => `target ${hours}`,
} satisfies Record<string, MessageValue>;

type MessageKey = keyof typeof enMessages;
type MessageDictionary = Record<MessageKey, MessageValue>;

export type { MessageKey };

const esMessages: MessageDictionary = {
  ...enMessages,
  "common.auto": "Automático (Sistema)",
  "common.back": "Atrás",
  "common.continue": "Continuar",
  "common.day": "Día",
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
  "home.petMoodFocused": "Enfocado",
  "home.petMoodHappy": "Feliz",
  "home.petMoodExcited": "Animado",
  "home.petMetricStreak": "Racha",
  "home.petMetricFocus": "Foco",
  "home.petMetricRhythm": "Ritmo",
  "home.weeklyProgressTitle": "Progreso de esta semana",
  "home.weeklyProgressNote": "Horas registradas contra el objetivo de cada día laboral.",
  "home.streakPanelTitle": "Racha actual",
  "home.streakPanelNote": "Mantén la cadena viva y deja que la semana siga encendida.",
  "home.weeklyPulse": "Pulso semanal",
  "home.thisWeek": "Esta semana",
  "home.weeklyRhythmEmpty": "Sincroniza tus datos para ver aquí tu ritmo semanal.",
  "home.headlineVictoryA": ({ alias }) => `Cerraste el día con fuerza, [[${alias}]].`,
  "home.headlineVictoryB": ({ alias }) => `Objetivo cumplido. Buen cierre, [[${alias}]].`,
  "home.headlineFocusA": ({ alias }) => `El día va tomando forma, [[${alias}]].`,
  "home.headlineFocusB": ({ alias }) => `Vas con buen ritmo, [[${alias}]]. El camino está claro.`,
  "home.headlineWeekendA": ({ alias }) => `Hoy toca un ritmo más suave, [[${alias}]].`,
  "home.headlineWeekendB": ({ alias }) => `Te viene bien un día más liviano, [[${alias}]].`,
  "home.headlineWarmupA": ({ alias }) => `Hay una página fresca esperando, [[${alias}]].`,
  "home.headlineWarmupB": ({ alias }) => `El tablero está limpio, [[${alias}]]. Ya puedes marcar el ritmo.`,
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
  "worklog.weeklyBreakdown": "Desglose semanal",
  "worklog.weeklyBreakdownNote": ({ range }) => `${range}. Elige un día para abrir su resumen completo.`,
  "worklog.weekSummary": "Resumen semanal",
  "worklog.periodSummary": "Resumen del período",
  "worklog.selectedRange": ({ range }) => `Rango seleccionado: ${range}`,
  "worklog.daySummary": "Resumen del día",
  "worklog.weekOf": ({ date }) => `Semana de ${date}`,
  "worklog.backTo": ({ parent }) => `Volver a ${parent}`,
  "worklog.auditFlags": "Alertas de auditoría",
  "worklog.auditFlagsDescription": "Revisa los elementos que podrían necesitar atención en este tramo seleccionado.",
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
  "worklog.auditFlagCount": ({ count }) => `${count} ${Number(count) === 1 ? "alerta" : "alertas"} de auditoría`,
  "worklog.noIssues": "No hay incidencias registradas para este día",
  "worklog.pickDifferentDate": "Elige otra fecha o registra algo de tiempo.",
  "worklog.targetLabel": ({ hours }) => `objetivo ${hours}`,
  "dashboard.weekTitle": "Semana",
  "dashboard.weekNote": "Horas de la semana actual.",
  "dashboard.loggedTime": "Horas registradas",
  "dashboard.loggedAcrossRange": "En este rango",
  "dashboard.targetTime": "Horas objetivo",
  "dashboard.expectedLoad": "Previstas para este rango",
  "dashboard.cleanDays": "Días dentro del objetivo",
  "dashboard.overflowCount": ({ count }) => `${count} ${Number(count) === 1 ? "día" : "días"} con exceso`,
  "dashboard.dailyBreakdown": "Desglose diario",
  "dashboard.pickDayToOpen": "Elige un día para abrir su resumen completo.",
  "settings.connection": "Conexión",
  "settings.providerSync": "Sincronización del proveedor",
  "settings.connectedTo": ({ host }) => `Conectado a ${host}`,
  "settings.notConnected": "Sin conectar",
  "settings.schedule": "Horario",
  "settings.calendarAndHolidays": "Calendario y festivos",
  "settings.appearance": "Apariencia",
  "settings.theme": "Tema",
  "settings.timeFormat": "Formato de tiempo",
  "settings.hoursAndMinutes": "Horas y minutos",
  "settings.decimal": "Decimal",
  "settings.durationHint": "Controla cómo se muestran las duraciones en toda la app.",
  "settings.hoursPerDaySummary": ({ hours }) => `${hours}h/día`,
  "settings.sync": "Sincronización",
  "settings.dataManagement": "Gestión de datos",
  "settings.resetDataDescription": "Restablece todos los datos locales, incluidas conexiones, registros y ajustes.",
  "settings.resetAllData": "Restablecer datos",
  "settings.shiftStart": "Inicio de jornada",
  "settings.shiftEnd": "Fin de jornada",
  "settings.lunchBreak": "Pausa de almuerzo",
  "settings.netHoursPerDay": "Horas netas/día",
  "settings.timezone": "Zona horaria",
  "settings.firstDayOfWeek": "Primer día de la semana",
  "settings.workdays": "Días laborables",
  "settings.syncNow": "Sincronizar ahora",
  "settings.lastSyncEntries": ({ count }) => `Última sincronización: ${count} entradas sincronizadas`,
  "settings.pullLatest": "Trae los últimos datos desde GitLab",
  "settings.autoSync": "Auto-sincronización",
  "settings.autoSyncDescription": "Trae datos de GitLab automáticamente en segundo plano",
  "settings.syncInterval": "Intervalo de sincronización",
  "settings.intervalMinutes": ({ count }) => `${count} min`,
  "settings.intervalHours": ({ count }) => `${count} ${Number(count) === 1 ? "hora" : "horas"}`,
  "settings.manualOnly": "Solo manual",
  "settings.everyInterval": ({ interval }) => `Cada ${interval}`,
  "settings.themeSummary": ({ theme, timeFormat }) => `Tema: ${theme} · Hora: ${timeFormat}`,
  "settings.failedHolidayPreferences": "No se pudieron guardar los festivos",
  "settings.failedSchedule": "No se pudo guardar el horario",
  "settings.tryAgain": "Vuelve a intentarlo.",
  "settings.system": "Sistema",
  "settings.light": "Claro",
  "settings.dark": "Oscuro",
  "settings.languageSummary": ({ language }) => `Idioma: ${language}`,
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
  "providers.oauthScopes": "con los scopes read_api y read_user. Configura la URI de redirección como timely://auth/gitlab",
  "providers.waitingForAuthorization": "Esperando la autorización de GitLab...",
  "providers.completeSignIn": "Completa el inicio de sesión en la ventana de autenticación. La app detectará el callback automáticamente.",
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
  "onboarding.welcomeDescription":
    "Tu panel personal de seguimiento del tiempo que se sincroniza con GitLab. Hemos cargado datos de ejemplo para que explores. ¡Hagamos un recorrido rápido!",
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
  "setup.noProviderYet": "Todavía no hay proveedor conectado. Puedes sincronizar después de la configuración.",
  "setup.syncComplete": "Sincronización completa",
  "setup.doneTitle": "¡Todo listo!",
  "setup.doneDescription": "Tu espacio está listo. Es hora de empezar a registrar.",
  "setup.openTimely": "Abrir Timely",
  "setup.continueButton": "Continuar",
  "play.feeling": ({ mood }) => `Estado: ${mood}`,
  "play.level": "Nivel",
  "play.xp": "XP",
  "play.streak": "Racha",
  "play.tokens": "Fichas",
  "play.noActiveQuests": "No hay misiones activas",
  "play.noActiveQuestsDescription": "Sincroniza tus datos para empezar misiones.",
  "gamification.weeklyStreak": "Racha semanal",
  "gamification.activeMissions": "Misiones activas",
  "gamification.complete": "¡Completa!",
  "audit.title": "Auditoría",
  "audit.note": "Faltantes y excesos.",
  "ui.close": "Cerrar",
  "tray.loadingStatus": "Cargando estado de la bandeja...",
  "tray.logged": ({ hours }) => `${hours} registrados`,
  "tray.left": ({ hours }) => `${hours} restantes`,
  "tray.syncFailedRetry": "La sincronización falló - intenta otra vez",
  "tray.syncing": "Sincronizando",
  "week.target": ({ hours }) => `objetivo ${hours}`,
};

const ptMessages: MessageDictionary = {
  ...enMessages,
  "common.auto": "Automático (Sistema)",
  "common.back": "Voltar",
  "common.continue": "Continuar",
  "common.day": "Dia",
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
  "home.noIssuesTodayDescription": "Comece a registrar tempo para ver sua lista de foco ganhar vida.",
  "home.momentum": "Ritmo",
  "home.momentumNote": "Um pulso rápido desta semana e sua sequência atual.",
  "home.ctaToday": "Abrir registro de hoje",
  "home.ctaWeek": "Revisar esta semana",
  "home.ctaWeekNote": "Ver o ritmo por dia",
  "home.ctaPeriod": "Inspecionar intervalo",
  "home.ctaPeriodNote": "Ver tendências mais amplas",
  "home.petPanelTitle": "Status do companheiro",
  "home.petMoodCalm": "Calmo",
  "home.petMoodFocused": "Focado",
  "home.petMoodHappy": "Feliz",
  "home.petMoodExcited": "Animado",
  "home.petMetricStreak": "Sequência",
  "home.petMetricFocus": "Foco",
  "home.petMetricRhythm": "Ritmo",
  "home.weeklyProgressTitle": "Progresso desta semana",
  "home.weeklyProgressNote": "Horas registradas contra a meta de cada dia útil.",
  "home.streakPanelTitle": "Sequência atual",
  "home.streakPanelNote": "Mantenha a corrente viva e deixe a semana continuar aquecida.",
  "home.weeklyPulse": "Pulso semanal",
  "home.thisWeek": "Esta semana",
  "home.weeklyRhythmEmpty": "Sincronize seus dados para ver seu ritmo semanal aqui.",
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
  "home.headlineVictoryA": ({ alias }) => `Voce fechou o dia com forca, [[${alias}]].`,
  "home.headlineVictoryB": ({ alias }) => `Meta concluida. Bom fechamento, [[${alias}]].`,
  "home.headlineFocusA": ({ alias }) => `O dia esta se alinhando bem, [[${alias}]].`,
  "home.headlineFocusB": ({ alias }) => `Bom ritmo, [[${alias}]]. O caminho esta limpo.`,
  "home.headlineWeekendA": ({ alias }) => `Hoje pede um ritmo mais leve, [[${alias}]].`,
  "home.headlineWeekendB": ({ alias }) => `Um dia mais leve combina com voce, [[${alias}]].`,
  "home.headlineWarmupA": ({ alias }) => `Existe uma pagina limpa esperando, [[${alias}]].`,
  "home.headlineWarmupB": ({ alias }) => `O quadro esta livre, [[${alias}]]. Ja da para marcar o ritmo.`,
  "home.insightTopIssue": ({ companion, issueKey, hours }) =>
    `${companion} diz que sua missão principal até agora é ${issueKey}. Você já gastou ${hours} nisso, então esse fio está guiando o dia.`,
  "home.insightWeekLogged": ({ companion, hours }) =>
    `${companion} já marcou ${hours} na semana visível. Mesmo que hoje esteja tranquilo, seu ritmo recente ainda conta uma boa história.`,
  "home.insightStart": ({ companion }) =>
    `${companion} está se alongando antes do primeiro sprint. Assim que sua primeira issue aparecer, esta tela vira seu pequeno centro de missão.`,
  "home.insightTopIssueA": ({ companion, issueKey, hours }) =>
    `[[${companion}]] continua voltando para [[${issueKey}]]. Ja existem [[${hours}]] ali, entao esse fio esta liderando o dia.`,
  "home.insightTopIssueB": ({ companion, issueKey, hours }) =>
    `Agora mesmo [[${issueKey}]] e o seu maior puxao. [[${companion}]] ja enxerga [[${hours}]] acumuladas nessa frente.`,
  "home.insightTopIssueC": ({ companion, issueKey, hours }) =>
    `O sinal mais claro do dia passa por [[${issueKey}]]. [[${companion}]] ja viu [[${hours}]] cairem nessa mesma linha.`,
  "home.insightWeekA": ({ companion, hours }) =>
    `[[${companion}]] ja viu [[${hours}]] aparecerem na semana visivel, entao mesmo um dia mais quieto ainda se apoia em um ritmo real.`,
  "home.insightWeekB": ({ companion, hours }) =>
    `A semana ja soma [[${hours}]] de trabalho. [[${companion}]] le isso como um ritmo que vale preservar.`,
  "home.insightWeekC": ({ companion, hours }) =>
    `Ja existem [[${hours}]] na semana atras de voce. [[${companion}]] trata hoje como o proximo passo limpo, nao como reinicio.`,
  "home.insightStartA": ({ companion }) =>
    `[[${companion}]] esta calmo e esperando o primeiro movimento de verdade. Assim que uma issue entrar, esta tela vira sua mesa de missao.`,
  "home.insightStartB": ({ companion }) =>
    `Ainda nao existe um sinal forte, mas [[${companion}]] esta pronto. Um unico bloco registrado ja acorda a tela inteira.`,
  "home.insightStartC": ({ companion }) =>
    `[[${companion}]] esta se alongando antes do primeiro sprint. No momento em que voce registra o bloco inicial, o dia comeca a ganhar forma aqui.`,
  "home.petCalmA": ({ companion, consistency }) =>
    `[[${companion}]] esta calmo agora. Seu ritmo de [[${consistency}]] mostra que ainda da para construir impulso sem correr.`,
  "home.petCalmB": ({ companion, focus }) =>
    `[[${companion}]] continua em modo calmo. Um pouco mais de [[${focus}]] de foco ja mudaria o tom do dia.`,
  "home.petFocusedA": ({ companion, focus, streak }) =>
    `[[${companion}]] esta travado no foco. Com [[${focus}]] de foco e uma sequencia de [[${streak}]], a proxima sessao pode empurrar o dia com limpeza.`,
  "home.petFocusedB": ({ companion, consistency }) =>
    `[[${companion}]] parece focado e pronto. Esse ritmo de [[${consistency}]] mostra que seus habitos estao se segurando.`,
  "home.petHappyA": ({ companion, streak, consistency }) =>
    `[[${companion}]] esta feliz. Uma sequencia de [[${streak}]] junto com [[${consistency}]] de consistencia faz tudo parecer sob controle.`,
  "home.petHappyB": ({ companion, focus }) =>
    `[[${companion}]] esta de bom humor. As [[${focus}]] de foco de hoje ja formam uma base solida.`,
  "home.petExcitedA": ({ companion, streak }) =>
    `[[${companion}]] esta animado e quer manter viva a sequencia de [[${streak}]]. Este e o momento de aproveitar a energia.`,
  "home.petExcitedB": ({ companion, consistency }) =>
    `[[${companion}]] esta vibrando. Um ritmo de [[${consistency}]] faz a corrida inteira parecer viva.`,
  "worklog.weeklyBreakdown": "Resumo semanal",
  "worklog.weeklyBreakdownNote": ({ range }) => `${range}. Escolha um dia para abrir o resumo completo.`,
  "worklog.weekSummary": "Resumo semanal",
  "worklog.periodSummary": "Resumo do período",
  "worklog.selectedRange": ({ range }) => `Intervalo selecionado: ${range}`,
  "worklog.daySummary": "Resumo do dia",
  "worklog.weekOf": ({ date }) => `Semana de ${date}`,
  "worklog.backTo": ({ parent }) => `Voltar para ${parent}`,
  "worklog.auditFlags": "Alertas de auditoria",
  "worklog.auditFlagsDescription": "Revise os itens que podem precisar de atenção neste recorte selecionado.",
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
  "worklog.auditFlagCount": ({ count }) => `${count} ${Number(count) === 1 ? "alerta" : "alertas"} de auditoria`,
  "worklog.noIssues": "Nenhuma issue registrada para este dia",
  "worklog.pickDifferentDate": "Escolha outra data ou registre algum tempo.",
  "worklog.targetLabel": ({ hours }) => `meta ${hours}`,
  "dashboard.weekTitle": "Semana",
  "dashboard.weekNote": "Horas na semana atual.",
  "dashboard.loggedTime": "Horas registradas",
  "dashboard.loggedAcrossRange": "Neste intervalo",
  "dashboard.targetTime": "Horas planejadas",
  "dashboard.expectedLoad": "Previstas para este intervalo",
  "dashboard.cleanDays": "Dias dentro da meta",
  "dashboard.overflowCount": ({ count }) => `${count} ${Number(count) === 1 ? "dia" : "dias"} acima da meta`,
  "dashboard.dailyBreakdown": "Detalhamento diário",
  "dashboard.pickDayToOpen": "Escolha um dia para abrir o resumo completo.",
  "settings.connection": "Conexão",
  "settings.providerSync": "Sincronização do provedor",
  "settings.connectedTo": ({ host }) => `Conectado a ${host}`,
  "settings.notConnected": "Não conectado",
  "settings.schedule": "Agenda",
  "settings.calendarAndHolidays": "Calendário e feriados",
  "settings.appearance": "Aparência",
  "settings.theme": "Tema",
  "settings.timeFormat": "Formato de tempo",
  "settings.hoursAndMinutes": "Horas e minutos",
  "settings.decimal": "Decimal",
  "settings.durationHint": "Controla como as durações são mostradas em todo o app.",
  "settings.hoursPerDaySummary": ({ hours }) => `${hours}h/dia`,
  "settings.sync": "Sincronização",
  "settings.dataManagement": "Gerenciamento de dados",
  "settings.resetDataDescription": "Redefine todos os dados locais, incluindo conexões, registros de tempo e configurações.",
  "settings.resetAllData": "Redefinir todos os dados",
  "settings.shiftStart": "Início do turno",
  "settings.shiftEnd": "Fim do turno",
  "settings.lunchBreak": "Pausa para almoço",
  "settings.netHoursPerDay": "Horas líquidas/dia",
  "settings.timezone": "Fuso horário",
  "settings.firstDayOfWeek": "Primeiro dia da semana",
  "settings.workdays": "Dias de trabalho",
  "settings.syncNow": "Sincronizar agora",
  "settings.lastSyncEntries": ({ count }) => `Última sincronização: ${count} registros sincronizados`,
  "settings.pullLatest": "Buscar os dados mais recentes do GitLab",
  "settings.autoSync": "Sincronização automática",
  "settings.autoSyncDescription": "Buscar dados do GitLab automaticamente em segundo plano",
  "settings.syncInterval": "Intervalo de sincronização",
  "settings.intervalMinutes": ({ count }) => `${count} min`,
  "settings.intervalHours": ({ count }) => `${count} ${Number(count) === 1 ? "hora" : "horas"}`,
  "settings.manualOnly": "Somente manual",
  "settings.everyInterval": ({ interval }) => `A cada ${interval}`,
  "settings.themeSummary": ({ theme, timeFormat }) => `Tema: ${theme} · Hora: ${timeFormat}`,
  "settings.failedHolidayPreferences": "Falha ao salvar preferências de feriados",
  "settings.failedSchedule": "Falha ao salvar agenda",
  "settings.tryAgain": "Tente novamente.",
  "settings.system": "Sistema",
  "settings.light": "Claro",
  "settings.dark": "Escuro",
  "settings.languageSummary": ({ language }) => `Idioma: ${language}`,
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
  "providers.oauthScopes": "com os escopos read_api e read_user. Defina a URI de redirecionamento como timely://auth/gitlab",
  "providers.waitingForAuthorization": "Aguardando autorização do GitLab...",
  "providers.completeSignIn": "Conclua o login na janela de autenticação. O app detectará o callback automaticamente.",
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
  "onboarding.welcomeDescription":
    "Seu painel pessoal de rastreamento de tempo sincronizado com o GitLab. Carregamos dados de exemplo para você explorar. Vamos fazer um tour rápido!",
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
  "setup.scheduleTitle": "Quando você trabalha?",
  "setup.scheduleDescription": "Defina seu horário e seus dias de trabalho",
  "setup.providerTitle": "Conectar GitLab",
  "setup.providerDescription": "Conecte sua conta para começar a rastrear tempo",
  "setup.syncTitle": "Sincronize seus dados",
  "setup.syncDescriptionConnected": "Buscando seus worklogs do GitLab",
  "setup.syncDescriptionDisconnected": "Você pode sincronizar depois em Configurações",
  "setup.noProviderYet": "Ainda não há provedor conectado. Você pode sincronizar depois da configuração.",
  "setup.syncComplete": "Sincronização concluída",
  "setup.doneTitle": "Tudo pronto!",
  "setup.doneDescription": "Seu espaço está pronto. Hora de começar a rastrear!",
  "setup.openTimely": "Abrir Timely",
  "setup.continueButton": "Continuar",
  "play.feeling": ({ mood }) => `Humor: ${mood}`,
  "play.level": "Nível",
  "play.xp": "XP",
  "play.streak": "Sequência",
  "play.tokens": "Tokens",
  "play.noActiveQuests": "Sem missões ativas",
  "play.noActiveQuestsDescription": "Sincronize seus dados para começar missões.",
  "gamification.weeklyStreak": "Sequência semanal",
  "gamification.activeMissions": "Missões ativas",
  "gamification.complete": "Concluída!",
  "audit.title": "Auditoria",
  "audit.note": "Faltas e excessos.",
  "ui.close": "Fechar",
  "tray.loadingStatus": "Carregando status da bandeja...",
  "tray.logged": ({ hours }) => `${hours} registrados`,
  "tray.left": ({ hours }) => `${hours} restantes`,
  "tray.syncFailedRetry": "A sincronização falhou - tente novamente",
  "tray.syncing": "Sincronizando",
  "week.target": ({ hours }) => `meta ${hours}`,
};

const messagesByLocale: Record<SupportedLocale, MessageDictionary> = {
  en: enMessages,
  es: esMessages,
  pt: ptMessages,
};

function interpolate(template: string, params: TranslationParams): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

function resolveMessage(locale: SupportedLocale, key: MessageKey, params: TranslationParams = {}): string {
  const value = messagesByLocale[locale][key] ?? enMessages[key];
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

function formatDateWithLocale(locale: SupportedLocale, date: Date, options: Intl.DateTimeFormatOptions) {
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
  return maybeRangeFormatter.formatRange?.(start, end) ?? `${formatter.format(start)} - ${formatter.format(end)}`;
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
  format: TimeFormat = "hm",
  translate: (key: MessageKey, params?: TranslationParams) => string,
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
    formatDateShort: (date) => formatDateWithLocale(locale, date, { month: "short", day: "numeric" }),
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
    formatHours: (value, format) => formatHoursWithLocale(locale, value, format, t),
    formatDayStatus: (status) => t(dayStatusKeyByValue[status]),
    formatAuditSeverity: (severity) => t(auditSeverityKeyByValue[severity]),
    formatLanguageLabel: (value) => formatLanguageLabelWithTranslate(t, value),
  };
}

function formatWeekdayFromCodeWithLocale(
  locale: SupportedLocale,
  code: keyof typeof WEEKDAY_INDEX_BY_CODE,
  style: "short" | "narrow" | "long",
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
  formatDateRange: (
    start: Date,
    end: Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatRelativeTime: (date: Date | null) => string;
  formatWeekdayFromCode: (
    code: keyof typeof WEEKDAY_INDEX_BY_CODE,
    style?: "short" | "narrow" | "long",
  ) => string;
  formatWeekdayFromDate: (date: Date, style?: "short" | "narrow" | "long") => string;
  formatMonthDayWeekday: (date: Date) => string;
  formatTimezoneOffset: (timezone: string) => string;
  formatHours: (value: number, format?: TimeFormat) => string;
  formatDayStatus: (status: DayStatus) => string;
  formatAuditSeverity: (severity: "high" | "medium" | "low") => string;
  formatLanguageLabel: (value: LanguagePreference) => string;
}

const I18nContext = createContext<I18nContextValue>(buildDefaultValue());

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>("auto");
  const locale = useMemo(() => resolveLocale(languagePreference), [languagePreference]);

  useEffect(() => {
    let cancelled = false;

    void loadAppPreferences()
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
      formatDateShort: (date) => formatDateWithLocale(locale, date, { month: "short", day: "numeric" }),
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
      formatHours: (amount, format) => formatHoursWithLocale(locale, amount, format, t),
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

export function parseDateString(date: string) {
  return new Date(`${date}T12:00:00`);
}

export function renderTranslation(
  locale: SupportedLocale,
  key: MessageKey,
  params?: TranslationParams,
) {
  return resolveMessage(locale, key, params);
}
