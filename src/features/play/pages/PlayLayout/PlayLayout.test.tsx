import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { PlayLayout } from "@/features/play/pages/PlayLayout/PlayLayout";
import { mockBootstrap } from "@/test/fixtures/mock-data";

vi.mock("@/core/services/BuildInfo/build-info", () => ({
  buildInfo: { playEnabled: true },
}));

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@/features/play/hooks/play-provider-state/play-provider-state", () => ({
  usePlayProviderValue: vi.fn(() => ({
    snapshot: null,
    loading: false,
    error: null,
  })),
}));

describe("PlayLayout", () => {
  it("renders tabs and outlet when play is enabled", async () => {
    const rootRoute = createRootRoute();
    const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/play",
      component: () => <PlayLayout payload={mockBootstrap} />,
    });
    const childRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: "/",
      component: () => <span>Play content</span>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([layoutRoute.addChildren([childRoute])]),
      history: createMemoryHistory({ initialEntries: ["/play"] }),
    });

    render(<RouterProvider router={router} />);
    await router.load();
    expect(screen.getByText("common.play")).toBeInTheDocument();
    expect(screen.getByText("Play content")).toBeInTheDocument();
  });
});
