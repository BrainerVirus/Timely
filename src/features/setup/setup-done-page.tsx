import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import Radar from "lucide-react/dist/esm/icons/radar.js";
import { Card } from "@/components/ui/card";
import { SetupShell } from "@/features/setup/setup-shell";

export function SetupDonePage({
  onOpenHome,
  onOpenWorklog,
  onOpenPlay,
}: {
  onOpenHome: () => void;
  onOpenWorklog: () => void;
  onOpenPlay: () => void;
}) {
  return (
    <SetupShell
      step="done"
      eyebrow="Done"
      title="Your workspace is ready"
      description="You now land in a proper shell with a guided setup path. The next passes will deepen Worklog, calendars, and the full play system."
      onBack={onOpenWorklog}
      backLabel="Review worklog"
      onNext={() => {
        onOpenHome();
      }}
      nextLabel="Open Home"
      secondaryAction={
        <button
          type="button"
          onClick={() => {
            onOpenPlay();
          }}
          className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Open Play
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            title: "Better landing",
            note: "The app now starts from Home and setup instead of a bad Settings-first flow.",
          },
          {
            icon: Radar,
            title: "Worklog center",
            note: "Day, week, month, and review are already grouped into one main page.",
          },
          {
            icon: Gamepad2,
            title: "Play center",
            note: "The game layer now has a home and will expand with real rewards next.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <div className="space-y-3">
                <Icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </SetupShell>
  );
}
