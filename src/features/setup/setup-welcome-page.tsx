import { SetupShell } from "@/features/setup/setup-shell";

export function SetupWelcomePage({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <SetupShell
      step="welcome"
      eyebrow="Welcome"
      title="Let’s set up your workspace properly"
      description="The app now starts with a guided path instead of dumping you into Settings. We’ll connect a provider, define your schedule, and prepare your daily dashboard."
      onNext={onNext}
      nextLabel="Start setup"
      secondaryAction={
        <button
          type="button"
          onClick={onSkip}
          className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Skip for now
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Connect providers",
            note: "GitLab is live now, and this setup is shaped for more providers later.",
          },
          {
            title: "Define work rhythm",
            note: "Set your working days, hours, and prepare for country-based holidays.",
          },
          {
            title: "Use one worklog center",
            note: "Day, week, month, and review are now moving into one coherent surface.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card/90 p-5 shadow-card">
            <p className="font-display text-lg font-semibold text-foreground">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </div>
    </SetupShell>
  );
}
