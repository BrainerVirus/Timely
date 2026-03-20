const BOOT_START_KEY = "__timelyBootStartMs";

type BootWindow = Window & {
  [BOOT_START_KEY]?: number;
};

function getBootWindow(): BootWindow | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window as BootWindow;
}

export function setBootStartMark(mark: number): void {
  const w = getBootWindow();
  if (!w) {
    return;
  }

  w[BOOT_START_KEY] = mark;
}

export function getBootElapsedMs(): number {
  const w = getBootWindow();
  const mark = w?.[BOOT_START_KEY];
  if (typeof mark !== "number") {
    return Math.round(performance.now());
  }

  return Math.round(performance.now() - mark);
}
