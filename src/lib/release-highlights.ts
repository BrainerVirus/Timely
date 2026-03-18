import type { SupportedLocale } from "@/types/dashboard";

export interface ReleaseHighlightsContent {
  title: string;
  badge: string;
  intro: string;
  bullets: string[];
  accent: string;
}

const releaseHighlightsByVersion: Record<
  string,
  Partial<Record<SupportedLocale, ReleaseHighlightsContent>>
> = {
  "0.1.0-beta.2": {
    en: {
      title: "Timely beta.2 is ready to review",
      badge: "Fresh in this build",
      intro:
        "This prerelease sharpens the update experience itself, so beta builds can behave more like a real upgrade path instead of a one-off installer.",
      bullets: [
        "Prerelease builds now default to the unstable update channel automatically, while stable builds keep stable as the default.",
        "Timely can now show a localized What's New dialog after you install a new version, and it only appears once per release.",
        "Updater checks, settings polish, and App test stability were tightened so shipping and validating future prereleases is less brittle.",
      ],
      accent: "A better release loop for every future build.",
    },
    es: {
      title: "Timely beta.2 ya está lista para probar",
      badge: "Nuevo en esta build",
      intro:
        "Esta preliminar mejora justo la experiencia de actualización, para que las builds beta se comporten más como un ciclo real de upgrades y menos como instalaciones aisladas.",
      bullets: [
        "Las builds preliminares ahora parten por defecto en el canal inestable, mientras que las releases estables conservan estable como canal inicial.",
        "Timely ahora puede mostrar un diálogo localizado con novedades después de instalar una versión nueva, y solo aparece una vez por release.",
        "También quedaron más firmes las comprobaciones del updater, el pulido de Ajustes y la estabilidad de los tests del App para futuras betas.",
      ],
      accent: "Un ciclo de releases más sólido para lo que viene.",
    },
    pt: {
      title: "O Timely beta.2 está pronto para teste",
      badge: "Novidades desta build",
      intro:
        "Esta prévia melhora justamente a experiência de atualização, para que as builds beta passem a se comportar mais como um fluxo real de upgrade do que como instalações isoladas.",
      bullets: [
        "Builds de pré-lançamento agora começam no canal instável por padrão, enquanto builds estáveis continuam no canal estável.",
        "O Timely agora pode mostrar um diálogo localizado com destaques da versão recém-instalada, exibido apenas uma vez por release.",
        "Também houve reforço nas verificações do updater, no acabamento da tela de Configurações e na estabilidade dos testes do App para as próximas betas.",
      ],
      accent: "Um ciclo de releases melhor para tudo que vem depois.",
    },
  },
};

export function getReleaseHighlights(version: string, locale: SupportedLocale) {
  const entry = releaseHighlightsByVersion[version];
  if (!entry) {
    return null;
  }

  return entry[locale] ?? entry.en ?? null;
}
