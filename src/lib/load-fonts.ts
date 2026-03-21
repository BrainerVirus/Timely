let criticalFontPromise: Promise<void> | null = null;
let deferredFontPromise: Promise<void> | null = null;

function importCriticalFonts(): Promise<void> {
  return Promise.all([
    import("@fontsource/fredoka/600.css"),
    import("@fontsource/fredoka/700.css"),
    import("@fontsource/nunito/400.css"),
    import("@fontsource/nunito/500.css"),
    import("@fontsource/nunito/600.css"),
    import("@fontsource/nunito/700.css"),
  ]).then(() => undefined);
}

function importDeferredFonts(): Promise<void> {
  return Promise.all([
    import("@fontsource/fredoka/400.css"),
    import("@fontsource/fredoka/500.css"),
    import("@fontsource/jetbrains-mono/400.css"),
    import("@fontsource/jetbrains-mono/500.css"),
  ]).then(() => undefined);
}

function waitForCriticalFontFaces(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) {
    return Promise.resolve();
  }

  const readiness = Promise.all([
    document.fonts.load('600 1rem "Fredoka"'),
    document.fonts.load('700 1rem "Fredoka"'),
    document.fonts.load('400 1rem "Nunito"'),
    document.fonts.load('500 1rem "Nunito"'),
    document.fonts.load('600 1rem "Nunito"'),
  ]).then(() => undefined);

  return Promise.race([
    readiness,
    new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 450);
    }),
  ]);
}

export function loadCriticalStartupFonts(): Promise<void> {
  criticalFontPromise ??= importCriticalFonts()
    .then(() => waitForCriticalFontFaces())
    .catch(() => {
      // best effort
    });

  return criticalFontPromise;
}

export function loadDeferredAppFonts(): Promise<void> {
  deferredFontPromise ??= new Promise((resolve) => {
    const start = () => {
      importDeferredFonts()
        .catch(() => {
          // best effort
        })
        .finally(() => {
          resolve();
        });
    };

    if (globalThis.window !== undefined && "requestIdleCallback" in globalThis) {
      const requestIdleCallback = globalThis.requestIdleCallback as (cb: () => void) => number;
      requestIdleCallback(start);
      return;
    }

    globalThis.setTimeout(start, 0);
  });

  return deferredFontPromise;
}
