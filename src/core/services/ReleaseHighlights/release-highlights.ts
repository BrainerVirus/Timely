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
  "0.1.0-beta.9": {
    en: {
      title: "Beta.9 holds Linux",
      badge: "Fresh polish",
      intro:
        "This beta focuses on keeping packaged Linux reminders alive long enough for the desktop to show them and report how they close.",
      bullets: [
        "Linux reminder notices now keep their desktop connection alive until the alert closes or a short safety timer steps in, giving GNOME-style desktops more time to actually show the notice.",
        "Reminder diagnostics now tell you whether Linux closed the alert, the safety timer released it, or the close listener failed, so support traces are much easier to trust.",
        "The Linux reminder path now watches for close events in the background, which reduces the chance that a test notice makes Timely feel stuck while the alert is still active.",
      ],
      accent: "Linux reminders get more room to breathe.",
    },
    es: {
      title: "Beta.9 sostiene Linux",
      badge: "Pulido nuevo",
      intro:
        "Esta beta se centra en dejar vivos los recordatorios instalados en Linux el tiempo suficiente para que el escritorio los muestre y para que el diagnóstico cuente cómo terminaron.",
      bullets: [
        "Los avisos de recordatorio en Linux ahora mantienen abierta su conexión con el escritorio hasta que el aviso se cierre o un temporizador corto de resguardo la libere, dando más margen a GNOME y escritorios parecidos para mostrarlo.",
        "El diagnóstico de recordatorios ahora indica si Linux cerró el aviso, si el temporizador de resguardo soltó la conexión o si falló el seguimiento del cierre, así que las trazas se pueden confiar mucho más.",
        "El seguimiento del cierre en Linux ahora corre en segundo plano, de modo que probar un aviso desde Ajustes tiene menos riesgo de dejar a Timely trabado mientras el aviso sigue vivo.",
      ],
      accent: "Linux gana avisos con más aire.",
    },
    pt: {
      title: "Beta.9 sustenta Linux",
      badge: "Polimento novo",
      intro:
        "Esta beta foca em manter vivos os lembretes instalados no Linux por tempo suficiente para a interface mostrá-los e para o diagnóstico contar como eles terminaram.",
      bullets: [
        "Os avisos de lembrete no Linux agora mantêm aberta a conexão com a interface até o aviso fechar ou um temporizador curto de resguardo liberá-la, dando mais tempo para o GNOME e interfaces parecidas mostrarem o alerta.",
        "O diagnóstico de lembretes agora informa se o Linux fechou o aviso, se o temporizador de resguardo soltou a conexão ou se o acompanhamento do fechamento falhou, deixando os rastreios bem mais confiáveis.",
        "O acompanhamento do fechamento no Linux agora roda em segundo plano, então testar um aviso em Configurações tem menos risco de deixar o Timely travado enquanto o alerta continua vivo.",
      ],
      accent: "Linux ganha avisos com mais fôlego.",
    },
  },
  "0.1.0-beta.8": {
    en: {
      title: "Beta.8 steadies Linux",
      badge: "Fresh polish",
      intro:
        "This beta focuses on packaged Linux reminders, so desktop notices are much more likely to behave like real Timely alerts instead of vanishing before you can see them.",
      bullets: [
        "Installed Linux builds now advertise the desktop entry GNOME expects, which gives reminder notices a steadier app identity on screen.",
        "Timely now ships an explicit Linux desktop file with notification support enabled, so Debian and RPM packages present themselves more consistently.",
        "Reminder diagnostics now log both the Linux desktop entry and icon name, making failed notification reports much easier to verify from one trace.",
      ],
      accent: "Linux gets a steadier nudge.",
    },
    es: {
      title: "Beta.8 afirma Linux",
      badge: "Pulido nuevo",
      intro:
        "Esta beta se centra en los recordatorios de Linux instalados desde paquete, para que los avisos del escritorio se comporten mucho más como avisos reales de Timely en vez de desaparecer antes de que los veas.",
      bullets: [
        "Las versiones instaladas en Linux ahora anuncian la entrada de escritorio que espera GNOME, dando a los recordatorios una identidad mucho más firme en pantalla.",
        "Timely ahora incluye un archivo de escritorio de Linux con soporte de avisos activado, para que los paquetes Debian y RPM se presenten con más consistencia.",
        "El diagnóstico de recordatorios ahora registra tanto la entrada de escritorio de Linux como el nombre del ícono, haciendo mucho más fácil comprobar un fallo con una sola traza.",
      ],
      accent: "Linux recibe un aviso más firme.",
    },
    pt: {
      title: "Beta.8 firma Linux",
      badge: "Polimento novo",
      intro:
        "Esta beta foca nos lembretes do Linux instalados por pacote, para que os avisos da interface tenham muito mais chance de se comportar como avisos reais do Timely em vez de sumirem antes de você ver.",
      bullets: [
        "As versões instaladas no Linux agora anunciam a entrada de área de trabalho que o GNOME espera, dando aos lembretes uma identidade bem mais firme na tela.",
        "O Timely agora inclui um arquivo de área de trabalho do Linux com suporte a avisos ativado, para que os pacotes Debian e RPM se apresentem com mais consistência.",
        "O diagnóstico de lembretes agora registra a entrada de área de trabalho do Linux e o nome do ícone, deixando muito mais simples confirmar uma falha com um único rastreio.",
      ],
      accent: "Linux ganha um aviso mais firme.",
    },
  },
  "0.1.0-beta.7": {
    en: {
      title: "Beta.7 sharpens alerts",
      badge: "Fresh polish",
      intro:
        "This beta makes reminders and diagnostics feel steadier across the whole desk, so the app is easier to trust when it needs your attention.",
      bullets: [
        "Reminder notices now use stronger desktop identity on Linux and Windows while keeping the improved banner behavior on macOS.",
        "The diagnostics console now leads with the affected feature, separates time and severity more clearly, and uses familiar blue, amber, and red log tones.",
        "Prerelease checks now run clean through formatting, linting, frontend tests, Rust tests, and the production build before a beta is prepared.",
      ],
      accent: "Sharper alerts, calmer desk energy.",
    },
    es: {
      title: "Beta.7 afila avisos",
      badge: "Pulido nuevo",
      intro:
        "Esta beta deja los recordatorios y el diagnóstico mucho más firmes en todo el escritorio, para que Timely se sienta más confiable justo cuando necesitas mirarlo.",
      bullets: [
        "Los avisos de recordatorio ahora llegan con una identidad más sólida en Linux y Windows, sin perder el mejor comportamiento de avisos en macOS.",
        "La consola de diagnóstico ahora empieza por la función afectada, separa mejor la hora y la severidad, y usa tonos azules, ámbar y rojos mucho más claros.",
        "Las comprobaciones previas de la beta ahora pasan limpias por formato, revisión estática, pruebas de la interfaz, pruebas de Rust y compilación de producción antes de preparar la versión.",
      ],
      accent: "Avisos más nítidos, escritorio más tranquilo.",
    },
    pt: {
      title: "Beta.7 afia avisos",
      badge: "Polimento novo",
      intro:
        "Esta beta deixa os lembretes e o diagnóstico mais firmes em toda a interface, para o Timely passar mais confiança justo quando você precisa olhar para ele.",
      bullets: [
        "Os avisos de lembrete agora usam uma identidade mais sólida no Linux e no Windows, sem perder o comportamento melhorado dos avisos no macOS.",
        "A consola de diagnóstico agora começa pela função afetada, separa melhor horário e severidade, e usa tons azuis, âmbar e vermelhos bem mais claros.",
        "As verificações antes da beta agora passam limpas por formatação, verificação estática, testes da interface, testes em Rust e compilação de produção antes de preparar a versão.",
      ],
      accent: "Avisos mais nítidos, mesa mais tranquila.",
    },
  },
  "0.1.0-beta.6": {
    en: {
      title: "Beta.6 finds its voice",
      badge: "Fresh polish",
      intro:
        "This beta makes Timely sound like itself across the whole desk, with more natural copy and fewer odd little language stumbles.",
      bullets: [
        "English, Spanish, and Portuguese now read more naturally across Home, Worklog, Settings, setup, tray, startup states, and the in-app update notes.",
        "Sync progress, audit notes, date labels, and other backend-generated messages now follow the same playful tone in the language you picked.",
        "Settings gives reminder diagnostics a clearer home with refresh, copy, export, and clear actions when notices start acting suspicious.",
      ],
      accent: "Less accidental bilingual chaos, more Timely sounding like Timely.",
    },
    es: {
      title: "Beta.6 ya suena bien",
      badge: "Pulido nuevo",
      intro:
        "Esta beta deja a Timely hablando con más naturalidad en todo el escritorio, con menos tropiezos raros y una voz mucho más propia.",
      bullets: [
        "El inglés, el español y el portugués ahora tienen mejor ritmo en Inicio, Registro de trabajo, Ajustes, configuración inicial, bandeja del sistema, estados de carga y notas de novedades.",
        "El avance de sincronización, las notas de auditoría, las fechas y otros mensajes que arma la interfaz ahora respetan el idioma elegido y suenan más humanos.",
        "Ajustes ahora deja revisar mejor los diagnósticos de recordatorios, con acciones para actualizar, copiar, exportar y limpiar cuando algo se pone mañoso.",
      ],
      accent: "Menos acento prestado, más Timely hablando como debe.",
    },
    pt: {
      title: "Beta.6 já soa certo",
      badge: "Polimento novo",
      intro:
        "Esta beta faz o Timely falar com mais naturalidade em toda a interface, com menos tropeços estranhos e uma voz bem mais própria.",
      bullets: [
        "Inglês, espanhol e português agora têm mais fluidez em Início, Registro de trabalho, Configurações, configuração inicial, bandeja do sistema, estados de carregamento e notas de novidades.",
        "O progresso da sincronização, as notas de auditoria, as datas e outras mensagens montadas pela interface agora respeitam o idioma escolhido e soam mais humanas.",
        "Configurações agora facilita a revisão dos diagnósticos de lembretes, com ações para atualizar, copiar, exportar e limpar quando algo resolve complicar.",
      ],
      accent: "Menos sotaque emprestado, mais Timely falando do jeito certo.",
    },
  },
  "0.1.0-beta.5": {
    en: {
      title: "Beta.5 speaks fox",
      badge: "Fresh mischief",
      intro:
        "Your companion finally stopped sounding dubbed. End-of-day nudges now follow the language you picked, with the same silly Timely charm intact.",
      bullets: [
        "Reminder titles and companion one-liners now feel native in English, Spanish, and Portuguese instead of borrowed from a suspicious subtitle file.",
        "Automatic language mode now checks your operating system language order first, so reminder copy stays in step with the rest of Timely.",
        "On macOS, reminder banners are easier to spot while Timely is front and center, so the polite panic still gets its little entrance.",
      ],
      accent: "Less tourist energy, more fluent chaos.",
    },
    es: {
      title: "Beta.5 ya habla zorro",
      badge: "Travieso nuevo",
      intro:
        "Tu compañero por fin dejó de sonar doblado encima. Los avisos del cierre del día ahora salen en el idioma que elegiste, con la misma gracia rara de Timely pero bien dicha.",
      bullets: [
        "Los títulos de los recordatorios y las frases del compañero ya suenan naturales en español, portugués e inglés, sin cara de traducción apurada.",
        "Si dejas el idioma en automático, Timely mira primero el orden de idiomas de tu sistema para no cambiarte el tono a mitad de camino.",
        "En macOS, los avisos se dejan ver mejor cuando Timely está al frente, así que el recordatorio todavía alcanza a tocarte el hombro.",
      ],
      accent: "Menos zorro turista, más travesura con acento propio.",
    },
    pt: {
      title: "Beta.5 fala raposa",
      badge: "Travessura nova",
      intro:
        "Seu companheiro finalmente parou de soar como dublagem torta. Os lembretes de fim de expediente agora seguem o idioma escolhido, com o mesmo humor tortinho do Timely, só que natural.",
      bullets: [
        "Títulos dos lembretes e falas do companheiro agora soam naturais em português, espanhol e inglês, sem aquela cara de texto importado às pressas.",
        "No modo automático, o Timely respeita primeiro a ordem de idiomas do sistema para manter o tom certinho do começo ao fim.",
        "No macOS, os avisos aparecem com mais clareza quando o Timely está em foco, então o lembrete ainda consegue dar seu cutucão elegante.",
      ],
      accent: "Menos raposa turista, mais caos no idioma certo.",
    },
  },
  "0.1.0-beta.4": {
    en: {
      title: "Beta.4 nudges back",
      badge: "Fresh mischief",
      intro:
        "Timely now gives you cheerful little end-of-shift nudges, so your worklog has a better chance of being finished before your brain clocks out first.",
      bullets: [
        "Pick how much warning you want: 45, 30, 15, or 5 minutes before shift end, each with its own level of gently escalating fox energy.",
        "Settings now includes a proper reminders section with one clear toggle, lead-time picks, permission help, and a test notice button for trust-but-verify moments.",
        "When you save time or finish a sync, reminders quietly reschedule themselves so you do not have to babysit them.",
      ],
      accent: "Less 5:59 panic, more tidy wrap-up energy.",
    },
    es: {
      title: "Beta.4 te pega un codazo",
      badge: "Travieso nuevo",
      intro:
        "Timely ahora te manda recordatorios con gracia antes de que termine la jornada, para que el Registro de trabajo no se quede mirando al vacío mientras tú ya vas saliendo.",
      bullets: [
        "Tú eliges el margen: 45, 30, 15 o 5 minutos antes del cierre, cada uno con su propio nivel de dramatismo amistoso.",
        "Ajustes ahora tiene una sección de recordatorios con interruptor claro, tiempos a elección, ayuda con permisos y un aviso de prueba para comprobar que todo quedó vivo.",
        "Si guardas horas o termina una sincronización, los recordatorios se recolocan solos para que no tengas que andar corrigiéndolos a mano.",
      ],
      accent: "Menos susto de última hora, más cierre prolijo.",
    },
    pt: {
      title: "Beta.4 dá um cutucão",
      badge: "Travessura nova",
      intro:
        "O Timely agora manda lembretes simpáticos antes do expediente acabar, para o Registro de trabalho não ficar para trás enquanto sua cabeça já foi embora.",
      bullets: [
        "Você escolhe o aviso: 45, 30, 15 ou 5 minutos antes do fim, cada faixa com seu próprio grau de drama educado.",
        "Configurações ganhou uma área de lembretes com botão principal, tempos personalizados, ajuda para permissões e um aviso de teste para conferir se o recado realmente chega.",
        "Ao salvar horas ou concluir uma sincronização, os lembretes se reorganizam sozinhos, sem trabalho manual extra.",
      ],
      accent: "Menos correria no apagar das luzes, mais fechamento caprichado.",
    },
  },
  "0.1.0-beta.3": {
    en: {
      title: "Beta.3 tidies up",
      badge: "Fresh polish",
      intro:
        "This beta smooths out the everyday desktop flow, with fewer rough edges and a more consistent feel across the app.",
      bullets: [
        "Worklog recovery now keeps the selected period context during recoverable load hiccups, so summary cards and expected hours stay coherent.",
        "Overflow handling no longer leaves awkward chrome strips behind, which keeps the top bar and page content visually lined up.",
        "Setup, tray, and shared interface surfaces now feel more like one product, with cleaner borders, shadows, and control styling.",
      ],
      accent: "Small polish, much nicer desk energy.",
    },
    es: {
      title: "Beta.3 pone orden",
      badge: "Pulido nuevo",
      intro:
        "Esta beta deja el uso diario más fino: menos asperezas, más coherencia visual y una sensación general de escritorio mejor cuidado.",
      bullets: [
        "El Registro de trabajo ahora conserva el contexto del período cuando una carga falla de forma recuperable, así que las tarjetas y las horas esperadas no pierden el hilo.",
        "El manejo del desbordamiento ya no deja franjas raras ni desalineadas, y la barra superior se mantiene en sintonía con el contenido.",
        "La configuración inicial, la bandeja del sistema y otras superficies compartidas recibieron un repaso para que bordes, sombras y controles hablen el mismo idioma visual.",
      ],
      accent: "Menos asperezas, más escritorio con oficio.",
    },
    pt: {
      title: "Beta.3 arruma a casa",
      badge: "Polimento novo",
      intro:
        "Esta beta deixa o uso do dia a dia mais redondo, com menos arestas visuais e uma sensação mais consistente por todo o aplicativo.",
      bullets: [
        "O Registro de trabalho agora preserva o contexto do período quando uma carga falha de forma recuperável, então cartões e horas esperadas continuam fazendo sentido.",
        "O tratamento de transbordamento não deixa mais faixas visuais desalinhadas, mantendo a barra superior e o conteúdo no mesmo ritmo.",
        "Configuração inicial, bandeja do sistema e outras superfícies compartilhadas receberam ajustes para alinhar bordas, sombras e estilo dos controles.",
      ],
      accent: "Menos ruído, mais mesa organizada.",
    },
  },
  "0.1.0-beta.2": {
    en: {
      title: "Beta.2 learns updates",
      badge: "Fresh polish",
      intro:
        "This beta makes updates feel like a real part of Timely instead of a side quest with suspicious timing.",
      bullets: [
        "Prerelease builds now default to the unstable channel automatically, while stable builds keep the stable channel by default.",
        "Timely can now show a localized What's New dialog after an update, and it appears only once for each version.",
        "Update checks and related settings flow were tightened up so future beta installs feel steadier and easier to trust.",
      ],
      accent: "Updates got less dramatic and much more useful.",
    },
    es: {
      title: "Beta.2 aprende a actualizarse",
      badge: "Pulido nuevo",
      intro:
        "Esta beta mejora el camino de las actualizaciones para que instalar una versión nueva se sienta normal y no como una maniobra sospechosa de último minuto.",
      bullets: [
        "Las versiones preliminares ya usan por defecto el canal inestable, mientras que las estables se quedan en el canal estable.",
        "Después de actualizar, Timely puede mostrar un cuadro de novedades localizado que aparece solo una vez por versión.",
        "También se afinó el flujo de comprobación y los ajustes relacionados para que las próximas betas se sientan más confiables.",
      ],
      accent: "Menos teatro al actualizar, más confianza real.",
    },
    pt: {
      title: "Beta.2 aprende a se atualizar",
      badge: "Polimento novo",
      intro:
        "Esta beta melhora o caminho das atualizações para que instalar uma versão nova pareça parte natural do Timely, e não um truque improvisado.",
      bullets: [
        "Versões preliminares agora usam por padrão o canal instável, enquanto as estáveis continuam no canal estável.",
        "Depois de atualizar, o Timely pode mostrar uma janela de novidades localizada que aparece só uma vez por versão.",
        "O fluxo de verificação e os ajustes relacionados também ficaram mais firmes para deixar as próximas betas mais confiáveis.",
      ],
      accent: "Menos suspense na atualização, mais paz na rotina.",
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
