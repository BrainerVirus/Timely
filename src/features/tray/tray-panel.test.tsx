import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrayPanel } from "@/features/tray/tray-panel";
import { mockBootstrap } from "@/lib/mock-data";
import * as tauriModule from "@/lib/tauri";

import type { WorklogSnapshot } from "@/types/dashboard";

const showMock = vi.fn();
const focusMock = vi.fn();
const unminimizeMock = vi.fn();
const invokeMock = vi.hoisted(() =>
  vi.fn(async (command: string) => {
    if (command === "bootstrap_dashboard") {
      return mockBootstrap;
    }
    if (command === "show_main_window") {
      unminimizeMock();
      showMock();
      focusMock();
      return undefined;
    }
    return undefined;
  }),
);

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@/lib/tauri", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    loadWorklogSnapshot: vi.fn(),
  };
});

function makeSnapshot(): WorklogSnapshot {
  return {
    mode: "day",
    range: {
      startDate: mockBootstrap.today.date,
      endDate: mockBootstrap.today.date,
      label: mockBootstrap.today.date,
    },
    selectedDay: mockBootstrap.today,
    days: mockBootstrap.week,
    month: mockBootstrap.month,
    auditFlags: mockBootstrap.auditFlags,
  };
}

describe("TrayPanel", () => {
  beforeEach(() => {
    invokeMock.mockClear();
    unminimizeMock.mockReset();
    showMock.mockReset();
    focusMock.mockReset();
    vi.mocked(tauriModule.loadWorklogSnapshot).mockReset().mockResolvedValue(makeSnapshot());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the compact tray quick view", () => {
    render(<TrayPanel payload={mockBootstrap} onClose={() => {}} />);

    expect(screen.getByText(/day summary|resumen del día|resumo do dia/i)).toBeInTheDocument();
    expect(screen.getByText(/^Logged \/ Target$/i)).toBeInTheDocument();
    expect(screen.queryByText(/clean slate today/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/target met|objetivo cumplido|meta cumprida/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/syncing|sincronizando/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/day off|día no laborable|dia não laborável/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Delta$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hide/i })).not.toBeInTheDocument();
  });

  it("keeps the manual sync action available", async () => {
    render(<TrayPanel payload={mockBootstrap} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /sync/i }));

    expect(
      await screen.findByRole("button", { name: /done|listo|concluído/i }),
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /sync now|sincronizar ahora|sincronizar/i }),
        ).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it("shows transient sync failure inside the button", async () => {
    invokeMock.mockImplementationOnce(async (command: string) => {
      if (command === "sync_gitlab") {
        throw new Error("sync failed");
      }
      if (command === "show_main_window") {
        unminimizeMock();
        showMock();
        focusMock();
      }
      return undefined;
    });

    render(<TrayPanel payload={mockBootstrap} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /sync/i }));

    expect(await screen.findByRole("button", { name: /failed|error|falhou/i })).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /sync now|sincronizar ahora|sincronizar/i }),
        ).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it("opens the main app and closes the tray", async () => {
    const onClose = vi.fn();
    render(<TrayPanel payload={mockBootstrap} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /^open$/i }));

    await waitFor(() => {
      expect(unminimizeMock).toHaveBeenCalledTimes(1);
      expect(showMock).toHaveBeenCalledTimes(1);
      expect(focusMock).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps a simple open button in the tray actions", async () => {
    render(<TrayPanel payload={mockBootstrap} onClose={() => {}} />);

    expect(await screen.findByRole("button", { name: /^open$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more actions/i })).not.toBeInTheDocument();
  });
});
