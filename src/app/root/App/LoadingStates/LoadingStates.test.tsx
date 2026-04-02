import { render, screen } from "@testing-library/react";
import { RouteLoadingState } from "@/app/root/App/LoadingStates/LoadingStates";

describe("LoadingStates", () => {
  describe("RouteLoadingState", () => {
    it("renders label", () => {
      render(<RouteLoadingState label="Loading..." />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
