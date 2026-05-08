import { renderTranslation } from "@/app/providers/I18nService/i18n";

import type { ProviderSyncOutcome, SupportedLocale, SyncResult } from "@/shared/types/dashboard";

export function formatSyncResultSummary(result: SyncResult, locale: SupportedLocale = "en"): string {
  const countSummary = renderTranslation(locale, "sync.summaryCounts", {
    projects: result.projectsSynced,
    entries: result.entriesSynced,
    issues: result.issuesSynced,
    assigned: result.assignedIssuesSynced,
  });
  if (result.status === "partial") {
    const failed = result.providers
      .filter((provider) => provider.status !== "success")
      .map((provider) => formatProviderLabel(provider.provider, locale));
    return renderTranslation(locale, "sync.summaryPartial", {
      counts: countSummary,
      providers: failed.join(", "),
    });
  }

  return renderTranslation(locale, "sync.summaryDone", { counts: countSummary });
}

export function formatSyncFailureSummary(result: SyncResult, locale: SupportedLocale = "en"): string {
  const failed = result.providers.filter((provider) => provider.status !== "success");
  if (failed.length === 0) {
    return renderTranslation(locale, "sync.failureNoProviders");
  }
  return renderTranslation(locale, "sync.failureHeader", {
    failures: failed.map((provider) => formatProviderFailure(provider, locale)).join(" "),
  });
}

export function formatProviderDiagnostics(result: SyncResult): string[] {
  return result.providers
    .filter((provider) => provider.status !== "success")
    .map((provider) => {
      const label = formatProviderLabel(provider.provider, "en");
      return `DIAGNOSTIC: ${label} ${provider.status}: ${provider.diagnostic}`;
    });
}

function formatProviderFailure(provider: ProviderSyncOutcome, locale: SupportedLocale): string {
  const label = formatProviderLabel(provider.provider, locale);
  switch (provider.status) {
    case "retryable_network":
      return renderTranslation(locale, "sync.providerNetworkFailure", { provider: label });
    case "auth_or_config":
      return renderTranslation(locale, "sync.providerAuthFailure", { provider: label });
    case "provider_failed":
      return renderTranslation(locale, "sync.providerReportedFailure", { provider: label });
    case "unknown_provider_error":
      return renderTranslation(locale, "sync.providerUnknownFailure", { provider: label });
    case "success":
      return renderTranslation(locale, "sync.providerSuccess", { provider: label });
  }
}

function formatProviderLabel(provider: string, locale: SupportedLocale): string {
  if (provider.toLowerCase() === "gitlab") return "GitLab";
  if (provider.toLowerCase() === "youtrack") return "YouTrack";
  return renderTranslation(locale, "sync.providerFallback");
}
