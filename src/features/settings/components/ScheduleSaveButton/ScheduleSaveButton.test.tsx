import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { ScheduleSaveButton } from "@/features/settings/components/ScheduleSaveButton/ScheduleSaveButton";

function renderWithI18n(phase: "idle" | "saving" | "saved", onClick: () => void = vi.fn()) {
  return render(
    <I18nProvider>
      <ScheduleSaveButton phase={phase} onClick={onClick} />
    </I18nProvider>,
  );
}

describe("ScheduleSaveButton", () => {
  it("renders save label when idle", () => {
    renderWithI18n("idle");
    expect(screen.getByRole("button", { name: /save schedule/i })).toBeInTheDocument();
  });

  it("renders saving label when saving", () => {
    renderWithI18n("saving");
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
  });

  it("renders saved label when saved", () => {
    renderWithI18n("saved");
    expect(screen.getByRole("button", { name: /schedule saved/i })).toBeInTheDocument();
  });

  it("is disabled when saving", () => {
    renderWithI18n("saving");
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick when clicked in idle state", () => {
    const onClick = vi.fn();
    renderWithI18n("idle", onClick);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
