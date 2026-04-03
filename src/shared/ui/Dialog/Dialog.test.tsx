import { readFileSync } from "node:fs";

function getKeyframeSection(name: string) {
  const styles = readFileSync("src/styles/globals.css", "utf8");
  const start = styles.indexOf(`@keyframes ${name}`);
  const next = styles.indexOf("@keyframes", start + 1);

  return styles.slice(start, next === -1 ? undefined : next);
}

describe("dialog keyframes", () => {
  it("animate scale without overriding dialog centering", () => {
    const dialogScaleIn = getKeyframeSection("dialogScaleIn");
    const dialogScaleOut = getKeyframeSection("dialogScaleOut");

    expect(dialogScaleIn).toContain("scale:");
    expect(dialogScaleOut).toContain("scale:");
    expect(dialogScaleIn).not.toContain("translate(");
    expect(dialogScaleOut).not.toContain("translate(");
  });
});
