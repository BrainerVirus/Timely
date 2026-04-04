import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { SetupIndexRoute, SetupLayoutRoute } from "@/app/routes/SetupRoutes/SetupRoutes";
import { useAppStore } from "@/app/state/AppStore/app-store";

vi.mock("@/app/layouts/SetupLayout/components/SetupShell/SetupShell", () => ({
  SetupShell: ({
    children,
    width,
    step,
    totalSteps,
  }: {
    children: React.ReactNode;
    width?: "default" | "wide";
    step: number;
    totalSteps: number;
  }) => (
    <div
      data-testid="setup-shell"
      data-width={width}
      data-step={step}
      data-total-steps={totalSteps}
    >
      {children}
    </div>
  ),
}));

describe("SetupRoutes", () => {
  beforeEach(() => {
    useAppStore.setState({
      lifecycle: { phase: "error", error: "test" },
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
    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-width", "default");
    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-total-steps", "6");
    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-step", "0");
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("uses the default setup shell on the schedule step until the weekly substep widens it", async () => {
    const rootRoute = createRootRoute();
    const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/setup",
      component: SetupLayoutRoute,
    });
    const scheduleRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: "/schedule",
      component: () => <span>Schedule content</span>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([layoutRoute.addChildren([scheduleRoute])]),
      history: createMemoryHistory({ initialEntries: ["/setup/schedule"] }),
    });

    render(<RouterProvider router={router} />);
    await router.load();

    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-width", "default");
    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-step", "1");
    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-total-steps", "6");
    expect(screen.getByText("Schedule content")).toBeInTheDocument();
  });

  it("uses progress step 2 when schedule URL has weekly substep", async () => {
    const rootRoute = createRootRoute();
    const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/setup",
      component: SetupLayoutRoute,
    });
    const scheduleRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: "/schedule",
      component: () => <span>Weekly schedule</span>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([layoutRoute.addChildren([scheduleRoute])]),
      history: createMemoryHistory({ initialEntries: ["/setup/schedule?substep=1"] }),
    });

    render(<RouterProvider router={router} />);
    await router.load();

    expect(screen.getByTestId("setup-shell")).toHaveAttribute("data-step", "2");
    expect(screen.getByText("Weekly schedule")).toBeInTheDocument();
  });
});
