import { fireEvent, render, screen } from "@testing-library/react";
import { ProviderSyncCard } from "@/features/settings/components/ProviderSyncCard/ProviderSyncCard";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { mockBootstrap } from "@/test/fixtures/mock-data";

import type { SyncState } from "@/shared/types/dashboard";

const idleSyncState: SyncState = {
  status: "idle",
  log: [],
};

const doneSyncState: SyncState = {
  status: "done",
  log: ["Done."],
  result: { projectsSynced: 2, entriesSynced: 10, issuesSynced: 3 },
};

function renderWithI18n(
  props: {
    payload?: typeof mockBootstrap;
    syncState?: SyncState;
    syncing?: boolean;
    onStartSync?: () => Promise<void>;
    onViewLog?: () => void;
  } = {},
) {
  return render(
    <I18nProvider>
      <ProviderSyncCard
        payload={props.payload ?? mockBootstrap}
        syncState={props.syncState ?? idleSyncState}
        syncing={false}
        onStartSync={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("ProviderSyncCard", () => {
  it("renders provider sync heading", () => {
    renderWithI18n();
    expect(screen.getByRole("heading", { name: /provider sync/i })).toBeInTheDocument();
  });

  it("renders sync button", () => {
    renderWithI18n();
    expect(screen.getByRole("button", { name: /sync now/i })).toBeInTheDocument();
  });

  it("calls onStartSync when sync button is clicked", async () => {
    const onStartSync = vi.fn().mockResolvedValue(undefined);
    renderWithI18n({ onStartSync });
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
    expect(onStartSync).toHaveBeenCalledTimes(1);
  });

  it("disables sync button when syncing", () => {
    renderWithI18n({ syncing: true });
    const syncButton = screen.getByRole("button", { name: /syncing/i });
    expect(syncButton).toBeDisabled();
  });

  it("shows done state when sync status is done", () => {
    renderWithI18n({ syncState: doneSyncState });
    expect(screen.getByText(/2|10|3|projects|entries|issues/i)).toBeInTheDocument();
  });

  it("shows view log button when log exists and onViewLog provided", () => {
    renderWithI18n({
      syncState: doneSyncState,
      onViewLog: vi.fn(),
    });
    expect(screen.getByRole("button", { name: /view log/i })).toBeInTheDocument();
  });
});
