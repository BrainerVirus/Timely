import { FoxMascot } from "@/components/shared/fox-mascot";
import { Button } from "@/components/ui/button";
import { SetupShell } from "./setup-shell";

interface SetupWelcomePageProps {
  onNext: () => void;
}

export function SetupWelcomePage({ onNext }: SetupWelcomePageProps) {
  return (
    <SetupShell step={0} totalSteps={5}>
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shadow-[var(--shadow-clay)]">
          <FoxMascot mood="celebrating" size={64} />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Welcome to Timely</h1>
          <p className="text-muted-foreground">Your personal worklog companion. Let's set up your workspace.</p>
        </div>
        <Button onClick={onNext} className="w-full">Get started</Button>
      </div>
    </SetupShell>
  );
}
