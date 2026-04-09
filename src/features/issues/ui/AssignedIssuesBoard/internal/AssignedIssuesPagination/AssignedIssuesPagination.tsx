import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import ChevronsLeft from "lucide-react/dist/esm/icons/chevrons-left.js";
import ChevronsRight from "lucide-react/dist/esm/icons/chevrons-right.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  buildAssignedIssuesPagination,
  getAssignedIssuesRange,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issues-pagination";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";

interface AssignedIssuesPaginationProps {
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function AssignedIssuesPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: Readonly<AssignedIssuesPaginationProps>) {
  const { t } = useI18n();
  const { start, end } = getAssignedIssuesRange(page, pageSize, totalItems);
  const items = buildAssignedIssuesPagination(page, totalPages);
  const disablePrevious = page <= 1;
  const disableNext = page >= totalPages;

  return (
    <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{t("issues.paginationRange", { start, end, total: totalItems })}</span>
      </div>

      <div className="flex justify-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label={t("issues.firstPage")}
            onClick={() => onPageChange(1)}
            disabled={disablePrevious}
            className={getCompactIconButtonClassName(false)}
          >
            <ChevronsLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("common.previous")}
            onClick={() => onPageChange(page - 1)}
            disabled={disablePrevious}
            className={getCompactIconButtonClassName(false)}
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border-2 border-border-subtle bg-tray p-1 shadow-clay-inset">
            {items.map((item) =>
              item.type === "page" ? (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onPageChange(item.page)}
                  className={getNeutralSegmentedControlClassName(
                    item.page === page,
                    "min-w-9 px-2 text-xs",
                  )}
                >
                  {item.page}
                </button>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  aria-label={t("issues.jumpPages", { page: item.targetPage })}
                  onClick={() => onPageChange(item.targetPage)}
                  className={getNeutralSegmentedControlClassName(false, "min-w-9 px-2 text-xs")}
                >
                  ...
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            aria-label={t("common.next")}
            onClick={() => onPageChange(page + 1)}
            disabled={disableNext}
            className={getCompactIconButtonClassName(false)}
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("issues.lastPage")}
            onClick={() => onPageChange(totalPages)}
            disabled={disableNext}
            className={getCompactIconButtonClassName(false)}
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground lg:justify-self-end">
        {t("issues.pageOfTotal", { page, total: totalPages })}
      </div>
    </div>
  );
}
