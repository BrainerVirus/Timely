import { formatHours } from "@/lib/utils";

describe("formatHours", () => {
  it("formats a float hour value with one decimal", () => {
    expect(formatHours(6.75)).toBe("6.8h");
  });
});
