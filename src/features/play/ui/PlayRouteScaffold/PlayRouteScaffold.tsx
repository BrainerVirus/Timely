import { useI18n } from "@/app/providers/I18nService/i18n";
import { Button } from "@/shared/ui/Button/Button";

import type { PlaySnapshot } from "@/shared/types/dashboard";

export function PlaySectionPage({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function CollectionSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function EmptyCollectionState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className="rounded-[1.5rem] border-2 border-dashed border-border-subtle bg-field px-4 py-6 text-center shadow-clay-inset">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function PaginationRow({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: Readonly<{
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}>) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border-subtle bg-field px-3 py-3 shadow-clay">
      <p className="text-xs font-semibold text-muted-foreground">
        {t("play.pageLabel", { current: currentPage, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={currentPage <= 1}
          onClick={onPrevious}
        >
          {t("common.previous")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={currentPage >= totalPages}
          onClick={onNext}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}

export function HeroMetricPill({
  label,
  tone,
}: Readonly<{ label: string; tone: "primary" | "neutral" }>) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/20 bg-primary/18 text-primary"
      : "border-white/35 bg-white/26 text-foreground/80";

  return (
    <span
      className={`rounded-full border-2 px-3 py-1 text-xs font-semibold shadow-button-soft backdrop-blur-md ${toneClasses}`}
    >
      {label}
    </span>
  );
}

export function HeroInlineStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      className="rounded-[1.15rem] border-2 border-white/28 px-3 py-2.5 shadow-clay backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-panel-elevated) 72%, transparent)",
      }}
    >
      <p className="text-[0.68rem] font-bold tracking-[0.18em] text-foreground/66 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function RecommendedMissionCard({
  quest,
}: Readonly<{ quest: PlaySnapshot["quests"][number] }>) {
  const { t } = useI18n();
  const progress =
    quest.targetValue === 0 ? 0 : Math.min(quest.progressValue / quest.targetValue, 1);

  const stateLabel =
    !quest.isClaimed && quest.progressValue >= quest.targetValue
      ? t("gamification.complete")
      : quest.isActive
        ? t("gamification.activeNow")
        : t(`gamification.category.${quest.category}` as const);

  return (
    <div className="rounded-xl border-2 border-border-subtle bg-field px-3 py-3 shadow-clay">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{quest.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{quest.description}</p>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/12 px-2 py-0.5 text-[0.65rem] font-bold text-primary">
          {stateLabel}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
          <span>{quest.rewardLabel}</span>
          <span>
            {quest.progressValue}/{quest.targetValue}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-panel shadow-clay-inset">
          <div
            className="h-1.5 rounded-full bg-linear-to-r from-primary to-secondary"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
