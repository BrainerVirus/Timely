import type { SupportedLocale } from "@/shared/types/dashboard";

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
  "0.1.0-beta.4": {
    en: {
      title: "Timely beta.4 — your fox taps you before closing time",
      badge: "Heads up",
      intro:
        "Your desk fox can now lob cheerful pings before shift end so the worklog does not get left behind while you are already half out the door.",
      bullets: [
        "Dial the drama: 45, 30, 15, or 5-minute warning shots. The lines scale from cozy spreadsheet nap to full biscuit-jar DEFCON—same energy as the notifications themselves.",
        "Settings grew a Reminders nook: one big on/off, pick your lead times, plain help for wrangling OS permissions, and a send-check-notice button when you need proof the fox can really shout.",
        "Save your hours or finish a clean GitLab sync and the countdown quietly recomposes itself—no hand-tuned alarm origami.",
      ],
      accent: "Less “yikes, 5:59”—more “nice log, legend.”",
    },
    es: {
      title: "Timely beta.4: tu compañero pica antes de cerrar",
      badge: "Atención simpática",
      intro:
        "El zorro de tu escritorio ya puede soltar avisos con chispa antes de que cierre la jornada, para que el Registro de trabajo no se quede a medias cuando ya tienes la chaqueta en la mano.",
      bullets: [
        "Elige el nivel de alboroto: 45, 30, 15 o 5 minutos de aviso. Los mensajes van de siestita con hoja de cálculo a emergencia del tarro de galletas, igual que cuando suenan de veras.",
        "En Ajustes hay rincón de Recordatorios: interruptor bien visible, horarios a tu gusto, cómo convencer al sistema de que deje pasar los permisos y el botón del aviso de comprobación cuando quieres ver si el chillido llega.",
        "Guardas el horario o el GitLab termina de sincronizar y los avisos se reordenan solos: cero lío manual con alarmas.",
      ],
      accent: "Menos «uf, casi me pilla»; más «cerraste el día como un campeón».",
    },
    pt: {
      title: "Timely beta.4: o companheiro cutuca antes do fim",
      badge: "Olha só",
      intro:
        "O companheiro agora manda uns toques divertidos antes do expediente acabar, para você não fechar o computador com o Registro de trabalho pela metade.",
      bullets: [
        "Escolhe o nível de caos: 45, 30, 15 ou 5 minutos de aviso. O texto vai do cochilo com planilha à emergência do pote de biscoito, no mesmo clima dos avisos de verdade.",
        "Em Configurações apareceu um cantinho de Lembretes: ligar/desligar geral, horários do seu jeito, um empurrãozinho pras permissões do sistema e o botão de aviso de verificação quando você quer ver o grito sair de verdade.",
        "Salvou a agenda ou a sincronização com o GitLab fechou bonitinho? Os lembretes se recompõem sozinhos, sem dobrar despertador na mão.",
      ],
      accent: "Menos «nossa, já é tarde»; mais «fechou o dia com estilo».",
    },
  },
  "0.1.0-beta.3": {
    en: {
      title: "Timely beta.3 is ready to use",
      badge: "New in this build",
      intro:
        "This prerelease focuses on reliability and visual consistency so day-to-day work feels smoother while we keep hardening the upgrade path.",
      bullets: [
        "Worklog period recovery now keeps period context during recoverable load failures, so summary cards and expected-hours messaging stay coherent.",
        "Shell scrollbar reservation no longer exposes mismatched chrome strips, which keeps the top bar and page body visually aligned during overflow.",
        "Setup, tray, and shared UI surfaces received consistency improvements for borders, shadows, and control styling.",
      ],
      accent: "A calmer, cleaner beta for everyday desktop flow.",
    },
    es: {
      title: "Timely beta.3 lista para usar",
      badge: "Novedades",
      intro:
        "Esta versión preliminar prioriza la estabilidad y la coherencia visual para que el uso diario sea más fluido.",
      bullets: [
        "En el Registro de trabajo, cuando falla una carga recuperable, se mantiene el contexto del período para que las tarjetas y las horas esperadas sigan siendo coherentes.",
        "La barra de desplazamiento deja de generar franjas visibles desalineadas; la barra superior y el contenido permanecen alineados.",
        "Ajustes de coherencia en la configuración inicial, la bandeja del sistema y el resto de la interfaz: bordes, sombras y estilos de controles.",
      ],
      accent: "Una beta más estable y agradable para el día a día.",
    },
    pt: {
      title: "Timely beta.3 pronto para uso",
      badge: "Novidades",
      intro:
        "Esta versão preliminar prioriza estabilidade e coerência visual para um uso diário mais fluido.",
      bullets: [
        "No Registro de trabalho, quando a carga falha de forma recuperável, o contexto do período é mantido e os cartões e horas esperadas seguem coerentes.",
        "A barra de rolagem não gera mais faixas desalinhadas; a barra superior e o conteúdo permanecem alinhados.",
        "Ajustes de coerência na configuração inicial, na bandeja do sistema e no restante da interface: bordas, sombras e estilos dos controles.",
      ],
      accent: "Uma beta mais estável e agradável para o uso real.",
    },
  },
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
      title: "Timely beta.2 lista para probar",
      badge: "Novedades",
      intro:
        "Esta versión preliminar mejora la experiencia de actualización para que las versiones beta funcionen como actualizaciones reales y no como instalaciones aisladas.",
      bullets: [
        "Las versiones preliminares usan por defecto el canal inestable de actualizaciones; las versiones estables mantienen el canal estable.",
        "Tras instalar una versión nueva, aparece un diálogo con novedades localizadas que solo se muestra una vez por versión.",
        "Se reforzaron la verificación del actualizador y el pulido de Ajustes para futuras betas.",
      ],
      accent: "Un ciclo de actualizaciones más sólido de ahora en adelante.",
    },
    pt: {
      title: "Timely beta.2 pronto para teste",
      badge: "Novidades",
      intro:
        "Esta versão preliminar melhora a experiência de atualização para que as versões beta funcionem como atualizações reais e não como instalações isoladas.",
      bullets: [
        "As versões preliminares usam por padrão o canal instável de atualizações; as versões estáveis mantêm o canal estável.",
        "Após instalar uma versão nova, aparece um diálogo com destaques localizados que só é exibido uma vez por versão.",
        "Houve reforço na verificação do atualizador e no acabamento de Configurações para as próximas betas.",
      ],
      accent: "Um ciclo de atualizações mais sólido daqui em diante.",
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
