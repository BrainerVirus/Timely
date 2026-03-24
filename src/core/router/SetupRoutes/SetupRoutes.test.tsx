import { render, screen } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { SetupIndexRoute, SetupLayoutRoute } from "@/core/router/SetupRoutes/SetupRoutes";
import { useAppStore } from "@/core/stores/AppStore/app-store";

vi.mock("@/layout/SetupLayout/components/SetupShell/SetupShell", () => ({
  SetupShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="setup-shell">{children}</div>
  ),
}));

describe("SetupRoutes", () => {
  beforeEach(() => {
    useAppStore.setState({
      lifecycle: { phase: "loading" },
      setupState: { currentStep: "welcome", isComplete: false, completedSteps: [] },
    });
  });

  it("SetupIndexRoute redirects to /setup/welcome", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: SetupIndexRoute,
    });
    const welcomeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/setup/welcome",
      component: () => <div>Welcome</div>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, welcomeRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    render(<RouterProvider router={router} />);
    await router.load();
    expect(router.state.location.pathname).toBe("/setup/welcome");
  });

  it("SetupLayoutRoute renders SetupShell with Outlet", async () => {
    const rootRoute = createRootRoute();
    const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/setup",
      component: SetupLayoutRoute,
    });
    const welcomeRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: "/welcome",
      component: () => <span>Child content</span>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([layoutRoute.addChildren([welcomeRoute])]),
      history: createMemoryHistory({ initialEntries: ["/setup/welcome"] }),
    });

    render(<RouterProvider router={router} />);
    await router.load();
    expect(screen.getByTestId("setup-shell")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
