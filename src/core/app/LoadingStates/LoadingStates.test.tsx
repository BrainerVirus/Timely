import { render, screen } from "@testing-library/react";
import { RouteLoadingState } from "@/core/app/LoadingStates/LoadingStates";

describe("LoadingStates", () => {
  describe("RouteLoadingState", () => {
    it("renders label", () => {
      render(<RouteLoadingState label="Loading..." />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
