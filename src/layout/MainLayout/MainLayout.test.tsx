import { describe, expect, it } from "vitest";
import { MainLayout } from "@/layout/MainLayout/MainLayout";

describe("MainLayout", () => {
  it("exports MainLayout component", () => {
    expect(MainLayout).toBeDefined();
    expect(typeof MainLayout).toBe("function");
  });
});
