/* Fonts: Space Grotesk (display) + DM Sans (body) + JetBrains Mono (mono) */
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
/* driver.js onboarding styles — loaded at root to avoid lazy-import issues */
import "driver.js/dist/driver.css";
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

const params = new URLSearchParams(window.location.search);
const view = params.get("view");

async function mount() {
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

  if (view === "tray") {
    const { TrayEntry } = await import("./features/tray/tray-entry");
    root.render(
      <React.StrictMode>
        <TrayEntry />
      </React.StrictMode>,
    );
  } else {
    const { default: App } = await import("./app/App");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}

mount();
