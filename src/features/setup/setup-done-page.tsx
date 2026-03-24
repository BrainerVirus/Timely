import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { FoxMascot } from "@/shared/components/fox-mascot";
import { Button } from "@/shared/ui/button";
import { useI18n } from "@/lib/i18n";

interface SetupDonePageProps {
  onOpenHome: () => void;
  isFinishing?: boolean;
}

export function SetupDonePage({ onOpenHome, isFinishing = false }: Readonly<SetupDonePageProps>) {
  const { t } = useI18n();

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shadow-clay">
        <FoxMascot mood="celebrating" size={64} animationMode="none" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("setup.doneTitle")}</h1>
        <p className="text-muted-foreground">{t("setup.doneDescription")}</p>
      </div>
      <Button onClick={onOpenHome} disabled={isFinishing} className="w-full">
        {isFinishing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("setup.finishing")}
          </>
        ) : (
          t("setup.openTimely")
        )}
      </Button>
    </div>
  );
}
