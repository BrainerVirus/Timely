import App from "@/app/App";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/tauri", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/tauri")>("@/lib/tauri");
  return {
    ...actual,
    listGitLabConnections: vi.fn(async () => [
      {
        id: 1,
        provider: "GitLab",
        displayName: "GitLab personal cockpit",
        host: "gitlab.com",
        state: "live",
        authMode: "OAuth PKCE + PAT fallback",
        preferredScope: "read_api",
        statusNote: "Demo connection stored locally.",
        oauthReady: true,
        isPrimary: true,
      },
    ]),
  };
});

describe("App", () => {
  it("renders the main dashboard shell", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Pulseboard")).toBeInTheDocument();
    });

    expect(screen.getByText(/Connect GitLab/i)).toBeInTheDocument();
  });
});
