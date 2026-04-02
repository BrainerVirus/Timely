import { useCallback, useMemo, useState } from "react";

import type { StorePrimaryTab, StoreSecondaryFilter } from "@/features/play/lib/play-i18n";
import type { RewardCatalogItem, RewardInventoryItem } from "@/shared/types/dashboard";

const STORE_PAGE_SIZE = 6;

function hasFeatured(r: RewardCatalogItem | RewardInventoryItem): r is RewardCatalogItem {
  return "featured" in r;
}

function hasUnlocked(r: RewardCatalogItem | RewardInventoryItem): r is RewardCatalogItem {
  return "unlocked" in r;
}

export function useShopFilters(translatedCatalog: Array<RewardCatalogItem | RewardInventoryItem>) {
  const [primaryTab, setPrimaryTab] = useState<StorePrimaryTab>("all");
  const [secondaryFilter, setSecondaryFilter] = useState<StoreSecondaryFilter>("all");
  const [page, setPage] = useState(1);

  const availableSecondaryFilters = useMemo<StoreSecondaryFilter[]>(() => {
    const base: StoreSecondaryFilter[] = ["all", "owned", "locked", "recovery"];
    if (primaryTab === "all" || primaryTab === "featured") {
      base.push("habitats", "wearables");
    }
    if (primaryTab === "accessories") {
      base.push("wearables");
    }
    if (primaryTab === "companions") {
      return ["all", "owned", "locked"];
    }

    return Array.from(new Set(base));
  }, [primaryTab]);

  const filteredRewards = useMemo(() => {
    let rewards = translatedCatalog;
    if (primaryTab === "featured") {
      rewards = rewards.filter(
        (r) => hasFeatured(r) && (r.featured || r.storeSection === "featured"),
      );
    } else if (primaryTab === "companions") {
      rewards = rewards.filter((reward) => reward.accessorySlot === "companion");
    } else if (primaryTab === "accessories") {
      rewards = rewards.filter((reward) => reward.accessorySlot !== "companion");
    }

    if (secondaryFilter === "owned") {
      rewards = rewards.filter((reward) => reward.owned);
    } else if (secondaryFilter === "locked") {
      rewards = rewards.filter((r) => hasUnlocked(r) && r.unlocked === false);
    } else if (secondaryFilter === "habitats") {
      rewards = rewards.filter((reward) => reward.accessorySlot === "environment");
    } else if (secondaryFilter === "wearables") {
      rewards = rewards.filter(
        (reward) => reward.accessorySlot !== "environment" && reward.accessorySlot !== "companion",
      );
    } else if (secondaryFilter === "recovery") {
      rewards = rewards.filter((reward) => reward.themeTag === "recovery");
    }

    return rewards;
  }, [primaryTab, secondaryFilter, translatedCatalog]);

  const totalPages = Math.max(1, Math.ceil(filteredRewards.length / STORE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRewards = filteredRewards.slice(
    (safePage - 1) * STORE_PAGE_SIZE,
    safePage * STORE_PAGE_SIZE,
  );

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as StorePrimaryTab;
    const baseFilters: StoreSecondaryFilter[] = ["all", "owned", "locked", "recovery"];
    if (nextTab === "all" || nextTab === "featured") {
      baseFilters.push("habitats", "wearables");
    }
    if (nextTab === "accessories") {
      baseFilters.push("wearables");
    }
    const nextFilters: StoreSecondaryFilter[] =
      nextTab === "companions" ? ["all", "owned", "locked"] : Array.from(new Set(baseFilters));

    setPrimaryTab(nextTab);
    setSecondaryFilter((prev) => (nextFilters.includes(prev) ? prev : "all"));
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((filter: StoreSecondaryFilter) => {
    setSecondaryFilter(filter);
    setPage(1);
  }, []);

  const handlePagePrevious = useCallback(() => {
    setPage((current) => Math.max(1, current - 1));
  }, []);

  const handlePageNext = useCallback(() => {
    setPage((current) => Math.min(totalPages, current + 1));
  }, [totalPages]);

  return {
    primaryTab,
    setPrimaryTab,
    secondaryFilter,
    availableSecondaryFilters,
    filteredRewards,
    pagedRewards,
    totalPages,
    safePage,
    handleTabChange,
    handleFilterChange,
    handlePagePrevious,
    handlePageNext,
  };
}
