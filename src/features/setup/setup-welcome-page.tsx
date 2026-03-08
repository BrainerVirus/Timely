import Radar from "lucide-react/dist/esm/icons/radar.js";
import { Button } from "@/components/ui/button";
import { SetupShell } from "./setup-shell";

interface SetupWelcomePageProps {
  onNext: () => void;
  onSkip: () => void;
}

export function SetupWelcomePage({ onNext, onSkip }: SetupWelcomePageProps) {
  return (
    <SetupShell step={0} totalSteps={5}>
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Radar className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">Welcome to Pulseboard</h1>
          <p className="text-muted-foreground">Your personal worklog companion. Let's set up your workspace.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={onNext} className="w-full">Get started</Button>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Skip for now
          </Button>
        </div>
      </div>
    </SetupShell>
  );
}
