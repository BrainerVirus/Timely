import {
  easeOut,
  pageVariants,
  scaleInVariants,
  springBouncy,
  springData,
  springGentle,
  staggerContainer,
  staggerItem,
} from "@/shared/utils/animations";

describe("animations", () => {
  describe("spring presets", () => {
    it("springBouncy has spring type and stiffness", () => {
      expect(springBouncy).toMatchObject({ type: "spring", stiffness: 400, damping: 25 });
    });

    it("springGentle has spring type", () => {
      expect(springGentle).toMatchObject({ type: "spring", stiffness: 200 });
    });

    it("springData has spring type", () => {
      expect(springData).toMatchObject({ type: "spring", duration: 0.5 });
    });
  });

  describe("easeOut", () => {
    it("is a cubic bezier tuple", () => {
      expect(easeOut).toEqual([0.25, 0.1, 0, 1]);
    });
  });

  describe("pageVariants", () => {
    it("has initial, animate, exit keys", () => {
      expect(pageVariants).toHaveProperty("initial");
      expect(pageVariants).toHaveProperty("animate");
      expect(pageVariants).toHaveProperty("exit");
    });

    it("initial has opacity 0 and y offset", () => {
      expect(pageVariants.initial).toMatchObject({ opacity: 0, y: 20 });
    });

    it("animate has opacity 1 and y 0", () => {
      expect(pageVariants.animate).toMatchObject({ opacity: 1, y: 0 });
    });
  });

  describe("scaleInVariants", () => {
    it("initial has scale 0.95", () => {
      expect(scaleInVariants.initial).toMatchObject({ opacity: 0, scale: 0.95 });
    });

    it("animate has scale 1", () => {
      expect(scaleInVariants.animate).toMatchObject({ opacity: 1, scale: 1 });
    });
  });

  describe("staggerContainer", () => {
    it("animate has staggerChildren", () => {
      const animate = staggerContainer.animate as { transition?: object };
      expect(animate.transition).toMatchObject({
        staggerChildren: 0.05,
        delayChildren: 0.1,
      });
    });
  });

  describe("staggerItem", () => {
    it("has initial and animate with opacity", () => {
      expect(staggerItem).toHaveProperty("initial");
      expect(staggerItem).toHaveProperty("animate");
    });
  });
});
