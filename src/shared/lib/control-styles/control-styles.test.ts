import {
  getChoiceButtonClassName,
  getCompactActionButtonClassName,
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
  getSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";

describe("control-styles", () => {
  describe("getSegmentedControlClassName", () => {
    it("includes active classes when active", () => {
      const result = getSegmentedControlClassName(true);
      expect(result).toContain("border-primary");
      expect(result).toContain("bg-primary");
    });

    it("includes inactive classes when not active", () => {
      const result = getSegmentedControlClassName(false);
      expect(result).toContain("border-border-subtle");
      expect(result).toContain("bg-tray");
    });

    it("merges additional className", () => {
      const result = getSegmentedControlClassName(true, "min-w-14");
      expect(result).toContain("min-w-14");
    });
  });

  describe("getChoiceButtonClassName", () => {
    it("includes active classes when active", () => {
      const result = getChoiceButtonClassName(true);
      expect(result).toContain("border-primary");
    });

    it("includes inactive classes when not active", () => {
      const result = getChoiceButtonClassName(false);
      expect(result).toContain("border-border-subtle");
    });
  });

  describe("getNeutralSegmentedControlClassName", () => {
    it("includes active state classes when active", () => {
      const result = getNeutralSegmentedControlClassName(true);
      expect(result).toContain("border-border-strong");
      expect(result).toContain("bg-tray-active");
    });

    it("includes transparent background when not active", () => {
      const result = getNeutralSegmentedControlClassName(false);
      expect(result).toContain("bg-transparent");
    });
  });

  describe("getCompactActionButtonClassName", () => {
    it("returns string with control classes", () => {
      const result = getCompactActionButtonClassName();
      expect(result).toContain("h-8");
      expect(result).toContain("rounded-xl");
    });

    it("merges additional className", () => {
      const result = getCompactActionButtonClassName("custom");
      expect(result).toContain("custom");
    });
  });

  describe("getCompactIconButtonClassName", () => {
    it("includes active classes when active", () => {
      const result = getCompactIconButtonClassName(true);
      expect(result).toContain("border-primary");
    });

    it("defaults to inactive when second arg omitted", () => {
      const result = getCompactIconButtonClassName();
      expect(result).toContain("border-border-subtle");
    });
  });
});
