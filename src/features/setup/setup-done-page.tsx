import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import { Button } from "@/components/ui/button";
import { SetupShell } from "./setup-shell";

interface SetupDonePageProps {
  onOpenHome: () => void;
}

export function SetupDonePage({ onOpenHome }: SetupDonePageProps) {
  return (
    <SetupShell step={4} totalSteps={5}>
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">You're all set!</h1>
          <p className="text-muted-foreground">Your workspace is ready</p>
        </div>
        <Button onClick={onOpenHome} className="w-full">Open Timely</Button>
      </div>
    </SetupShell>
  );
}
