import { FoxMascot } from "@/shared/components/fox-mascot";
import { Button } from "@/shared/ui/button";
import { useI18n } from "@/core/runtime/i18n";
interface SetupWelcomePageProps {
  onNext: () => void;
}

export function SetupWelcomePage({ onNext }: Readonly<SetupWelcomePageProps>) {
  const { t } = useI18n();

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shadow-clay">
        <FoxMascot mood="celebrating" size={64} animationMode="none" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("setup.welcomeTitle")}</h1>
        <p className="text-muted-foreground">{t("setup.welcomeDescription")}</p>
      </div>
      <Button onClick={onNext} className="w-full">
        {t("common.getStarted")}
      </Button>
    </div>
  );
}
