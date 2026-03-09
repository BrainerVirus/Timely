import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";

export function RouteLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
