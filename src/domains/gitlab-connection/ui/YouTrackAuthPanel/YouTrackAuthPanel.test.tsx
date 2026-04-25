import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { YouTrackAuthPanel } from "@/domains/gitlab-connection/ui/YouTrackAuthPanel/YouTrackAuthPanel";

describe("YouTrackAuthPanel", () => {
  it("connects with host and token", async () => {
    const onSaveConnection = vi.fn().mockResolvedValue({
      id: 2,
      provider: "YouTrack",
      displayName: "YouTrack workspace",
      host: "company.youtrack.cloud",
      hasToken: true,
      state: "live",
      authMode: "PAT",
      preferredScope: "api",
      statusNote: "Connected",
      oauthReady: true,
      isPrimary: true,
    });
    const onSavePat = vi.fn().mockResolvedValue({
      id: 2,
      provider: "YouTrack",
      displayName: "YouTrack workspace",
      host: "company.youtrack.cloud",
      hasToken: true,
      state: "live",
      authMode: "PAT",
      preferredScope: "api",
      statusNote: "Connected",
      oauthReady: true,
      isPrimary: true,
    });

    render(
      <I18nProvider>
        <YouTrackAuthPanel
          connections={[]}
          onSaveConnection={onSaveConnection}
          onSavePat={onSavePat}
        />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("your-company.youtrack.cloud"), {
      target: { value: "company.youtrack.cloud" },
    });
    fireEvent.change(screen.getByPlaceholderText("perm:xxxxxxxx"), {
      target: { value: "perm:token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Connect YouTrack" }));

    await waitFor(() => {
      expect(onSaveConnection).toHaveBeenCalled();
      expect(onSavePat).toHaveBeenCalledWith("youtrack", "company.youtrack.cloud", "perm:token");
    });
  });
});
