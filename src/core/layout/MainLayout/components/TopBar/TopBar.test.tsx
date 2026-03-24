import { fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "@/core/layout/MainLayout/components/TopBar/TopBar";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({
    t: (key: string) => key,
    formatRelativeTime: () => "2 min ago",
  })),
}));

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: { prereleaseLabel: null },
}));

describe("TopBar", () => {
  it("renders title and sync button", () => {
    render(<TopBar title="Worklog" lastSyncedAt={null} syncing={false} onSync={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Worklog" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "topBar.sync" })).toBeInTheDocument();
  });

  it("calls onSync when sync clicked", () => {
    const onSync = vi.fn();
    render(<TopBar title="Worklog" lastSyncedAt={null} syncing={false} onSync={onSync} />);
    fireEvent.click(screen.getByRole("button", { name: "topBar.sync" }));
    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
