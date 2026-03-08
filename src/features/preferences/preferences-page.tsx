import Globe from "lucide-react/dist/esm/icons/globe.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Type from "lucide-react/dist/esm/icons/type.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useReducer, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchedulePreferencesCard } from "@/features/preferences/schedule-preferences-card";
import {
  createInitialScheduleFormState,
  formatNetHours,
  scheduleFormReducer,
} from "@/features/preferences/schedule-form";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { cardContainerVariants } from "@/lib/animations";
import {
  loadAppPreferences,
  loadHolidayCountries,
  loadHolidayPreview,
  loadHolidayRegions,
  loadScheduleRules,
  saveAppPreferences,
} from "@/lib/tauri";

import type {
  AppPreferences,
  BootstrapPayload,
  HolidayCountryOption,
  HolidayPreviewItem,
  HolidayRegionOption,
  ProviderConnection,
  ScheduleInput,
  ScheduleRule,
} from "@/types/dashboard";

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

interface PreferencesPageProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
  onRefreshBootstrap?: () => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export function PreferencesPage({
  payload,
  connections,
  onUpdateSchedule,
  onRefreshBootstrap,
  onResetAllData,
}: PreferencesPageProps) {
  const { theme, setTheme } = useTheme();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [countries, setCountries] = useState<HolidayCountryOption[]>([]);
  const [preferences, setPreferences] = useState<AppPreferences>({
    themeMode: theme,
    language: "en",
    holidayCountryCode: "CL",
    holidayRegionCode: "RM",
  });
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
  const [regions, setRegions] = useState<HolidayRegionOption[]>([]);
  const [holidayPreview, setHolidayPreview] = useState<HolidayPreviewItem[]>([]);
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, schedulePhase } = scheduleForm;
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);
  const primary = connections.find((c) => c.isPrimary) ?? connections[0];

  useEffect(() => {
    void loadAppPreferences()
      .then((nextPreferences) => {
        setPreferences(nextPreferences);
      })
      .catch(() => {
        // best effort, use defaults
      });

    void loadScheduleRules()
      .then(setScheduleRules)
      .catch(() => {
        // schedule rules are additive for now
      });

    void loadHolidayCountries().then(setCountries).catch(() => {
      // fallback to empty options
    });
  }, []);

  useEffect(() => {
    void loadHolidayRegions(preferences.holidayCountryCode)
      .then(setRegions)
      .catch(() => {
        setRegions([]);
      });

    void loadHolidayPreview(preferences.holidayCountryCode, preferences.holidayRegionCode)
      .then(setHolidayPreview)
      .catch(() => {
        setHolidayPreview([]);
      });
  }, [preferences.holidayCountryCode, preferences.holidayRegionCode]);

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) return;

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        shiftStart,
        shiftEnd,
        lunchMinutes: Number.parseInt(lunchMinutes) || 0,
        workdays,
        timezone,
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });
      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }
    } catch {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
    }
  }

  return (
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Preferences
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-foreground">Make the app fit how you work</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Appearance, schedule, language, and future accessibility controls belong here - not in
                a generic profile dump.
              </p>
            </div>
          </div>

          <div className="border-t border-border/70 bg-muted/35 p-5 lg:border-t-0 lg:border-l sm:p-6">
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Primary workspace</p>
              <p className="mt-3 font-display text-xl font-semibold text-foreground">
                {primary?.displayName ?? payload.profile.alias}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{primary?.host ?? payload.schedule.timezone}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Appearance</h3>
                <p className="text-xs text-muted-foreground">
                  Theme presets now live in Preferences and will expand with more visual systems.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                  Theme
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {THEME_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = theme === opt.value;
                    return (
                      <m.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={opt.value}
                        type="button"
                        onClick={() => setTheme(opt.value)}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </m.button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PreferenceInfoTile
                  icon={Globe}
                  label="Language"
                  value="English"
                  note="Multilingual support will land here next."
                />
                <PreferenceInfoTile
                  icon={Type}
                  label="Accessibility"
                  value="Default"
                  note="High contrast, text scale, and reduced motion will live here."
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Holiday calendar</h3>
                <p className="text-xs text-muted-foreground">
                  Package-backed international calendar data with region-aware public holidays.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select
                    value={preferences.holidayCountryCode ?? "CL"}
                    onValueChange={(value) => {
                      const next = { ...preferences, holidayCountryCode: value, holidayRegionCode: undefined };
                      setPreferences(next);
                      void saveAppPreferences(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Select
                    value={preferences.holidayRegionCode ?? "all"}
                    onValueChange={(value) => {
                      const next = {
                        ...preferences,
                        holidayRegionCode: value === "all" ? undefined : value,
                      };
                      setPreferences(next);
                      void saveAppPreferences(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">All regions</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region.code} value={region.code}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-border bg-muted/20 p-3">
                  <Calendar
                    mode="single"
                    selected={new Date()}
                    month={new Date()}
                    className="border-0 bg-transparent p-0"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Upcoming public holidays
                  </div>

                  <AnimatePresence initial={false}>
                    <div className="grid gap-2">
                      {holidayPreview.map((holiday) => (
                        <m.div
                          key={`${holiday.date}-${holiday.name}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="rounded-xl border border-border bg-muted/30 p-3"
                        >
                          <p className="text-sm font-medium text-foreground">{holiday.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{holiday.date}</p>
                        </m.div>
                      ))}
                    </div>
                  </AnimatePresence>

                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Stored selection: {preferences.holidayCountryCode ?? "-"}
                    {preferences.holidayRegionCode ? ` / ${preferences.holidayRegionCode}` : " / all regions"}.
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {scheduleRules.length > 0
                      ? `Loaded ${scheduleRules.length} schedule rule records for future custom exceptions and overrides.`
                      : "No custom schedule rules yet. Your selected workdays currently drive weekday behavior, while legal holidays stay enforced."}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <SchedulePreferencesCard
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
        lunchMinutes={lunchMinutes}
        workdays={workdays}
        timezone={timezone}
        netHours={netHours}
        schedulePhase={schedulePhase}
        canSave={Boolean(onUpdateSchedule)}
        onShiftStartChange={(value) => dispatchScheduleForm({ type: "setShiftStart", value })}
        onShiftEndChange={(value) => dispatchScheduleForm({ type: "setShiftEnd", value })}
        onLunchMinutesChange={(value) => dispatchScheduleForm({ type: "setLunchMinutes", value })}
        onToggleWorkday={(day) => dispatchScheduleForm({ type: "toggleWorkday", day })}
        onSave={handleSaveSchedule}
      />
      <DataManagementCard onResetAllData={onResetAllData} />
    </m.div>
  );
}

function PreferenceInfoTile({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/35 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-3 font-display text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function DataManagementCard({ onResetAllData }: { onResetAllData: () => Promise<void> }) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Data management</h3>
          <p className="text-xs text-muted-foreground">
            Reset all local data including connections, time entries, and settings.
          </p>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
          This action clears the local workspace and restarts onboarding.
        </div>
        <button
          type="button"
          onClick={() => {
            void onResetAllData();
          }}
          className="cursor-pointer rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/15"
        >
          Reset all data
        </button>
      </div>
    </Card>
  );
}
