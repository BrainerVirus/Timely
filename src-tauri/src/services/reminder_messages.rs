//! Urgency tiers and reminder copy for workday notifications (deterministic for tests).

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Resolves `AppPreferences.language` (`auto` | `en` | `es` | `pt`) to a copy locale for reminders.
pub fn effective_reminder_locale(language_pref: &str) -> &'static str {
    let lang = language_pref.trim();
    if lang.eq_ignore_ascii_case("es") {
        return "es";
    }
    if lang.eq_ignore_ascii_case("pt") {
        return "pt";
    }
    if lang.eq_ignore_ascii_case("en") {
        return "en";
    }
    if lang.eq_ignore_ascii_case("auto") {
        for key in ["LC_MESSAGES", "LANG", "LANGUAGE"] {
            if let Ok(var) = std::env::var(key) {
                let lower = var.to_lowercase();
                if lower.starts_with("es") {
                    return "es";
                }
                if lower.starts_with("pt") {
                    return "pt";
                }
            }
        }
    }
    "en"
}

/// Localized notification title for a threshold (minutes before shift end).
pub fn reminder_notification_title(minutes: u32, locale: &str) -> String {
    match locale {
        "es" => format!("Timely · quedan {minutes} minutos"),
        "pt" => format!("Timely · faltam {minutes} minutos"),
        _ => format!("Timely · {minutes} min to go"),
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UrgencyTier {
    Calm,
    Warming,
    Urgent,
    Critical,
}

/// Maps minutes before shift end and progress vs target into an urgency tier.
pub fn resolve_urgency_tier(
    minutes_before_shift_end: u32,
    logged_hours: f32,
    target_hours: f32,
) -> UrgencyTier {
    if target_hours <= 0.01 {
        return UrgencyTier::Calm;
    }

    let behind = (target_hours - logged_hours).max(0.0);
    let pct_behind = behind / target_hours;

    // Highest: almost no time left and essentially nothing logged.
    if minutes_before_shift_end <= 5 && logged_hours < 0.05 && target_hours > 0.1 {
        return UrgencyTier::Critical;
    }

    if minutes_before_shift_end <= 5 || (minutes_before_shift_end <= 15 && pct_behind > 0.5) {
        return UrgencyTier::Urgent;
    }

    if minutes_before_shift_end <= 30 || pct_behind > 0.2 {
        return UrgencyTier::Warming;
    }

    UrgencyTier::Calm
}

const EN_POOLS: [&[&str]; 4] = [
    // Calm
    &[
        "{c} is curled up with a spreadsheet. Gentle nudge to log a bit more.",
        "{c} has snacks ready if you close a few entries.",
        "{c} says the board is quiet—perfect time for a tidy worklog.",
        "{c} is napping but left a sticky: check your issues?",
    ],
    // Warming
    &[
        "{c} is pacing by the door. You still have time to update your issues.",
        "{c} side-eyes the clock. Maybe one more GitLab pass?",
        "{c} is doing gentle aerobics. Shift end is getting closer.",
        "{c} whispers: a quick log now saves dinner-time panic.",
    ],
    // Urgent
    &[
        "{c} turned the biscuit jar upside down. The worklog needs love!",
        "{c} is on emergency biscuit rations. Please rescue the task board.",
        "{c} squeaks: the deadline lane is closing—log what you can!",
        "{c} has the alarm blaring (politely). Touch the worklog?",
    ],
    // Critical
    &[
        "{c} is sliding toward DEFCON cute. Zero hours logged—tap GitLab now!",
        "{c} deploys maximum tail fluff. Log something before the bell!",
        "{c} is hiding under the desk until the worklog moves.",
        "{c} sends one last boop: type the time—you still have minutes!",
    ],
];

const ES_POOLS: [&[&str]; 4] = [
    &[
        "{c} está acurrucada con la hoja de cálculo. Un empujoncito para anotar un poco más.",
        "{c} tiene galletas para cuando cierres unas entradas más.",
        "{c} dice que el tablero está tranquilo: buen momento para ordenar el registro de trabajo.",
        "{c} duerme pero dejó una nota: ¿revisas tus tareas?",
    ],
    &[
        "{c} pasea cerca de la puerta. Aún tienes tiempo para actualizar tus tareas.",
        "{c} mira el reloj con mala cara. ¿Otra pasada por GitLab?",
        "{c} hace estiramientos suaves. El fin de la jornada se acerca.",
        "{c} susurra: un registro rápido ahora evita el apuro de después.",
    ],
    &[
        "{c} vació el tarro de galletas. ¡El registro de trabajo pide cariño!",
        "{c} raciona galletas de emergencia. ¡Rescata el tablero de tareas!",
        "{c} pita: el carril del plazo se cierra, anota lo que puedas.",
        "{c} tiene la alarma (con educación). ¿Tocas el registro de trabajo?",
    ],
    &[
        "{c} entra en modo máximo peluche. Sin horas registradas: ¡abre GitLab!",
        "{c} despliega cola al máximo. Registra algo antes del pitido.",
        "{c} se esconde bajo la mesa hasta que el registro avance.",
        "{c} lanza un último empujón: anota el tiempo, aún quedan minutos.",
    ],
];

const PT_POOLS: [&[&str]; 4] = [
    &[
        "{c} está enrolada com a planilha. Um empurrãozinho para registrar mais um pouco.",
        "{c} deixa petisco pronto se você fechar mais algumas entradas.",
        "{c} diz que o quadro está quieto: boa hora para arrumar o registro de trabalho.",
        "{c} cochila mas deixou um recado: você revisa as tarefas?",
    ],
    &[
        "{c} anda de um lado ao outro perto da porta. Ainda dá tempo de atualizar as tarefas.",
        "{c} olha o relógio com cara feia. Mais uma passada no GitLab?",
        "{c} faz alongamentos leves. O fim do expediente chega perto.",
        "{c} sussurra: um registro rápido agora evita pânico depois.",
    ],
    &[
        "{c} virou o pote de biscoito de ponta-cabeça. O registro de trabalho precisa de carinho!",
        "{c} está em racionamento de emergência de biscoito. Salva o quadro de tarefas!",
        "{c} pia: o carril do prazo fecha — registra o que der.",
        "{c} ligou o alarme (com educação). Toca no registro de trabalho?",
    ],
    &[
        "{c} entra no modo máximo fofura. Zero horas registradas — abre o GitLab agora!",
        "{c} abre o rabo no máximo. Registra algo antes do sinal!",
        "{c} se esconde debaixo da mesa até o registro andar.",
        "{c} manda um último toque: digita o tempo — ainda dá tempo!",
    ],
];

fn pools_for_locale(locale: &str) -> [&[&str]; 4] {
    match locale {
        "es" => ES_POOLS,
        "pt" => PT_POOLS,
        _ => EN_POOLS,
    }
}

/// Stable message pick from pools using companion + tier + salt (e.g. date + threshold).
pub fn pick_reminder_message(tier: UrgencyTier, companion: &str, salt: u64, locale: &str) -> String {
    let pools = pools_for_locale(locale);
    let pool_idx = match tier {
        UrgencyTier::Calm => 0,
        UrgencyTier::Warming => 1,
        UrgencyTier::Urgent => 2,
        UrgencyTier::Critical => 3,
    };

    let pool = pools[pool_idx];
    let mut hasher = DefaultHasher::new();
    companion.hash(&mut hasher);
    salt.hash(&mut hasher);
    let idx = (hasher.finish() as usize) % pool.len();
    pool[idx].replace("{c}", companion)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn critical_when_five_min_left_and_no_time_logged() {
        assert_eq!(resolve_urgency_tier(5, 0.0, 8.0), UrgencyTier::Critical);
    }

    #[test]
    fn calm_when_far_from_end_and_on_track() {
        assert_eq!(resolve_urgency_tier(60, 7.5, 8.0), UrgencyTier::Calm);
    }

    #[test]
    fn warming_when_within_thirty_minutes() {
        assert_eq!(resolve_urgency_tier(25, 6.0, 8.0), UrgencyTier::Warming);
    }

    #[test]
    fn message_same_salt_is_deterministic() {
        let a = pick_reminder_message(UrgencyTier::Calm, "Aurora", 42, "en");
        let b = pick_reminder_message(UrgencyTier::Calm, "Aurora", 42, "en");
        assert_eq!(a, b);
        assert!(a.contains("Aurora"));
    }

    #[test]
    fn spanish_pool_is_deterministic_and_localized() {
        let a = pick_reminder_message(UrgencyTier::Calm, "Aurora", 42, "es");
        let b = pick_reminder_message(UrgencyTier::Calm, "Aurora", 42, "es");
        assert_eq!(a, b);
        assert!(a.contains("Aurora"));
        assert!(
            a.contains("hoja") || a.contains("galletas") || a.contains("tablero") || a.contains("duerme"),
            "expected Spanish pool copy: {a}"
        );
    }

    #[test]
    fn effective_locale_explicit_preferences() {
        assert_eq!(effective_reminder_locale("es"), "es");
        assert_eq!(effective_reminder_locale("  PT "), "pt");
        assert_eq!(effective_reminder_locale("EN"), "en");
    }

    #[test]
    fn reminder_title_follows_locale() {
        assert_eq!(
            reminder_notification_title(5, "es"),
            "Timely · quedan 5 minutos"
        );
        assert_eq!(
            reminder_notification_title(5, "pt"),
            "Timely · faltam 5 minutos"
        );
        assert_eq!(
            reminder_notification_title(5, "en"),
            "Timely · 5 min to go"
        );
    }
}
