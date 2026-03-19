import { cleanup, render, waitFor } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { MotionProvider } from "@/lib/motion";

vi.mock("@/lib/tauri", () => ({
  listenDesktopEvent: vi.fn(async () => () => {}),
}));

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

describe("MotionProvider", () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.motion;
  });

  it("sets the root motion attribute from the app preference", async () => {
    render(
      <MotionProvider motionPreference="reduced">
        <div>child</div>
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("reduced");
    });
  });

  it("keeps full motion when the app preference overrides system reduced motion", async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    render(
      <MotionProvider motionPreference="full">
        <div>child</div>
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("full");
    });
  });

  it("clears the root motion attribute on unmount", async () => {
    const { unmount } = render(
      <MotionProvider motionPreference="reduced">
        <div>child</div>
      </MotionProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("reduced");
    });

    unmount();

    expect(document.documentElement.dataset.motion).toBeUndefined();
  });
});
