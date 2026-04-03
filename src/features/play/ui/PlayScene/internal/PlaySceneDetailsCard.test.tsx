import { render, screen } from "@testing-library/react";
import { PlaySceneDetailsCard } from "@/features/play/ui/PlayScene/internal/PlaySceneDetailsCard";

describe("PlaySceneDetailsCard", () => {
  it("renders translated habitat copy when explicit content is not provided", () => {
    render(<PlaySceneDetailsCard compact={false} scene="aurora" t={(key) => key} />);

    expect(screen.getByText("play.habitat.aurora.title")).toBeInTheDocument();
    expect(screen.getByText("play.habitat.aurora.description")).toBeInTheDocument();
  });
});
