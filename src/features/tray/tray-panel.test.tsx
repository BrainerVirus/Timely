import { TrayPanel } from "@/features/tray/tray-panel";
import { mockBootstrap } from "@/lib/mock-data";
import { fireEvent, render, screen } from "@testing-library/react";

describe("TrayPanel", () => {
  it("renders today's issues and hides on request", () => {
    const onClose = vi.fn();
    render(<TrayPanel payload={mockBootstrap} onClose={onClose} />);

    expect(screen.getByText(/Issues/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /hide/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
