import { render, screen } from "@testing-library/react";
import { PlayPage } from "@/features/play/play-page";
import { tourPayload } from "@/features/onboarding/tour-mock-data";

describe("PlayPage", () => {
  it("renders the companion mood block with friendly copy", async () => {
    render(<PlayPage payload={tourPayload} />);

    expect(await screen.findByText(/Companion mood/i)).toBeInTheDocument();
    expect(await screen.findByText(/Mood: Calm/i)).toBeInTheDocument();
    expect(await screen.findByText(/steady pace keeps the den peaceful/i)).toBeInTheDocument();
  });
});
