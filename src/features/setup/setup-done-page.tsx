import { FoxMascot } from "@/components/shared/fox-mascot";
import { Button } from "@/components/ui/button";
import { SetupShell } from "./setup-shell";

interface SetupDonePageProps {
  onOpenHome: () => void;
}

export function SetupDonePage({ onOpenHome }: SetupDonePageProps) {
  return (
    <SetupShell step={4} totalSteps={5}>
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shadow-[var(--shadow-clay)]">
          <FoxMascot mood="celebrating" size={64} />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">You're all set!</h1>
          <p className="text-muted-foreground">Your workspace is ready. Time to start tracking!</p>
        </div>
        <Button onClick={onOpenHome} className="w-full">Open Timely</Button>
      </div>
    </SetupShell>
  );
}
