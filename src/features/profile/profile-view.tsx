import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import User from "lucide-react/dist/esm/icons/user.js";
import { m } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { clearOnboardingState } from "@/features/onboarding/onboarding-flow";
import { useNotify } from "@/hooks/use-notify";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { cardContainerVariants } from "@/lib/animations";
import { resetAllData } from "@/lib/tauri";

import type { BootstrapPayload, ProviderConnection } from "@/types/dashboard";

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

interface ProfileViewProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
}

export function ProfileView({ payload, connections }: ProfileViewProps) {
  const { theme, setTheme } = useTheme();
  const notify = useNotify();
  type ResetPhase = "idle" | "confirming" | "resetting";
  const [resetPhase, setResetPhase] = useState<ResetPhase>("idle");

  const primary = connections.find((c) => c.isPrimary) ?? connections[0];

  async function handleReset() {
    if (resetPhase === "idle") {
      setResetPhase("confirming");
      return;
    }
    setResetPhase("resetting");
    try {
      await resetAllData();
      clearOnboardingState();
      notify.success("Data cleared", "All data has been reset. Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      notify.error("Reset failed", String(err));
      setResetPhase("idle");
    }
  }

  return (
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* User info */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-border bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold text-foreground">
              {primary?.displayName ?? payload.profile.alias}
            </h3>
            {primary?.username && (
              <p className="truncate text-sm text-muted-foreground">@{primary.username}</p>
            )}
            {primary && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                <span className="truncate">{primary.host}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Appearance</h3>
            <p className="text-xs text-muted-foreground">
              Choose how Pulseboard looks on your device.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="flex gap-1.5">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.value;
                return (
                  <button
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
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Language
            </Label>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                English
              </span>
              <span className="text-xs text-muted-foreground/60">More languages coming soon</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Data Management
            </h3>
            <p className="text-xs text-muted-foreground">
              Reset all local data including connections, time entries, and settings.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="text-sm text-foreground/80">
              <p className="font-medium text-destructive">This action cannot be undone.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All synced data, provider connections, and settings will be permanently deleted. You
                will need to reconnect and sync again.
              </p>
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleReset}
            disabled={resetPhase === "resetting"}
          >
            {resetPhase === "resetting" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            {resetPhase === "resetting"
              ? "Resetting..."
              : resetPhase === "confirming"
                ? "Confirm reset"
                : "Reset all data"}
          </Button>
          {resetPhase === "confirming" && (
            <button
              type="button"
              onClick={() => setResetPhase("idle")}
              className="ml-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      </Card>
    </m.div>
  );
}
