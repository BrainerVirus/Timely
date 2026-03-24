# In-App Highlights Localization Guide

Guidance for writing the `es` and `pt` locale content in `src/core/services/ReleaseHighlights/release-highlights.ts`. These rules also apply to app-wide i18n strings in `src/core/services/I18nService/i18n.tsx`. Project-wide localization rules live in `AGENTS.md` § Localization.

## Data shape

Each locale object has these fields:

```ts
{
  title: string       // Short headline shown at top of dialog (≤ 5 words)
  badge: string       // Small label/pill (1–2 words, e.g., "Beta", "Novo")
  intro: string       // One sentence introducing the release
  bullets: string[]   // Exactly 3 feature/improvement bullets
  accent: string      // CSS color token or hex for the dialog accent
}
```

## Writing principles

**First-class localization, not translation.** Each locale must read as if written by a native speaker for that market. No English words in es/pt — use proper equivalents (e.g., "barra de desplazamiento" not "scrollbar", "bandeja del sistema" not "tray", "configuración inicial" not "setup", "actualizador" not "updater"). Adapt structure, idiom, and phrasing; never produce English with words swapped.

**Tone:** Friendly and professional. Same voice as the English copy — clear, enthusiastic without being hyperbolic. Avoid filler phrases ("we are pleased to announce…").

**Title:** Should be punchy and fit the dialog header. 3–5 words. Can be slightly different from English if a literal translation sounds awkward.

**Badge:** Single localized label. Common values: `"Beta"` (same in all locales), `"Novo"` (pt), `"Nuevo"` (es), `"Estable"` (es stable).

**Intro:** One sentence. Should convey the main theme of the release. Can be rephrased freely — the goal is clarity and tone, not word-for-word equivalence.

**Bullets:** Should cover the same features as the English bullets, but each bullet is its own sentence adapted for the locale. Keep bullets at roughly the same length as English — one short sentence each.

**Accent:** Use the same value as the English entry. It's a visual token, not locale-specific.

## Example

```ts
"1.2.3-beta.1": {
  en: {
    title: "Faster sync",
    badge: "Beta",
    intro: "This beta focuses on sync speed and worklog reliability.",
    bullets: [
      "Sync completes up to 3× faster for large date ranges.",
      "Worklog entries now load without flickering on first open.",
      "Fixed a crash when switching accounts rapidly.",
    ],
    accent: "#6366f1",
  },
  es: {
    title: "Sincronización más rápida",
    badge: "Beta",
    intro: "Esta beta se centra en la velocidad de sincronización y la fiabilidad del registro.",
    bullets: [
      "La sincronización es hasta 3 veces más rápida en rangos de fecha amplios.",
      "Las entradas del registro de trabajo ya no parpadean al abrirse por primera vez.",
      "Se corrigió un bloqueo al cambiar de cuenta rápidamente.",
    ],
    accent: "#6366f1",
  },
  pt: {
    title: "Sincronização mais rápida",
    badge: "Beta",
    intro: "Esta beta foca na velocidade de sincronização e na confiabilidade do registro.",
    bullets: [
      "A sincronização é até 3× mais rápida em intervalos de datas extensos.",
      "As entradas do registro de trabalho agora carregam sem piscar na primeira abertura.",
      "Corrigida uma falha ao trocar de conta rapidamente.",
    ],
    accent: "#6366f1",
  },
},
```

## Banned in release notes (all locales)

Never use internal/implementation language: "Phase N", "refactor(s)", "readonly", "globalThis", "code-split", "boundary violation", "AGENTS.md", "FRONTEND_ARCHITECTURE". Rephrase in user-facing terms (e.g., "UI consistency improvements" instead of "readonly/globalThis refactors").

**Banned in es/pt (no English words):** scrollbar, shell, setup, tray, build(s), release, updater, upgrade, App, tests, workflow. Use equivalents: barra de desplazamiento / barra de rolagem, interfaz / interface, configuración / configuração, bandeja del sistema / bandeja do sistema, versión / versão, actualizador / atualizador, actualización / atualização.

## Common pitfalls

- **Don't carry over English idioms literally** — e.g., "up to 3x faster" translates differently in Spanish vs Portuguese; check natural phrasing.
- **Verb tense in bullets:** Spanish/Portuguese often use past tense for fixes ("Se corrigió") and present for features ("La sincronización es…"). Match this pattern.
- **Gender agreement:** Spanish and Portuguese adjectives agree with their noun. Double-check agreement for words like "rápida/rápido", "nuevo/nueva".
- **`pt` vs `pt-BR`:** Timely uses `pt` for Portuguese. Prefer Brazilian Portuguese norms (e.g., "você" over "tu", "registro" over "registo") unless the project has an established preference otherwise.
