use chrono::{Datelike, NaiveDate};

use crate::services::reminder_messages::effective_reminder_locale;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AppLocale {
    En,
    Es,
    Pt,
}

impl AppLocale {
    pub fn from_language_pref(language_pref: &str) -> Self {
        match effective_reminder_locale(language_pref) {
            "es" => Self::Es,
            "pt" => Self::Pt,
            _ => Self::En,
        }
    }
}

pub fn format_day_heading(date: NaiveDate, locale: AppLocale) -> String {
    match locale {
        AppLocale::Es => format!(
            "{}, {:02} {}",
            weekday_long(date, locale),
            date.day(),
            month_short(date, locale)
        ),
        AppLocale::Pt => format!(
            "{}, {:02} de {}",
            weekday_long(date, locale),
            date.day(),
            month_short(date, locale)
        ),
        AppLocale::En => format!(
            "{}, {} {:02}",
            weekday_long(date, locale),
            month_short(date, locale),
            date.day()
        ),
    }
}

pub fn format_week_label(start: NaiveDate, locale: AppLocale) -> String {
    match locale {
        AppLocale::Es => format!(
            "Semana del {:02} {}",
            start.day(),
            month_short(start, locale)
        ),
        AppLocale::Pt => format!(
            "Semana de {:02} {}",
            start.day(),
            month_short(start, locale)
        ),
        AppLocale::En => format!("Week of {} {:02}", month_short(start, locale), start.day()),
    }
}

pub fn format_month_label(start: NaiveDate, locale: AppLocale) -> String {
    match locale {
        AppLocale::Es | AppLocale::Pt => {
            format!("{} de {}", month_long(start, locale), start.year())
        }
        AppLocale::En => format!("{} {}", month_long(start, locale), start.year()),
    }
}

pub fn format_range_label(start: NaiveDate, end: NaiveDate, locale: AppLocale) -> String {
    format!(
        "{:02} {} - {:02} {}",
        start.day(),
        month_short(start, locale),
        end.day(),
        month_short(end, locale)
    )
}

pub fn format_day_chip(date: NaiveDate, locale: AppLocale) -> String {
    format!("{} {:02}", weekday_short(date, locale), date.day())
}

pub fn weekday_short(date: NaiveDate, locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => match date.weekday().num_days_from_monday() {
            0 => "lun",
            1 => "mar",
            2 => "mié",
            3 => "jue",
            4 => "vie",
            5 => "sáb",
            _ => "dom",
        },
        AppLocale::Pt => match date.weekday().num_days_from_monday() {
            0 => "seg",
            1 => "ter",
            2 => "qua",
            3 => "qui",
            4 => "sex",
            5 => "sáb",
            _ => "dom",
        },
        AppLocale::En => match date.weekday().num_days_from_monday() {
            0 => "Mon",
            1 => "Tue",
            2 => "Wed",
            3 => "Thu",
            4 => "Fri",
            5 => "Sat",
            _ => "Sun",
        },
    }
}

pub fn sync_lookup_connection(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => "Buscando la puerta correcta de GitLab...",
        AppLocale::Pt => "Procurando a porta certa do GitLab...",
        AppLocale::En => "Looking for the right GitLab door...",
    }
}

pub fn sync_connecting(locale: AppLocale, host: &str) -> String {
    match locale {
        AppLocale::Es => format!("Hablando con {host}..."),
        AppLocale::Pt => format!("Falando com {host}..."),
        AppLocale::En => format!("Talking to {host}..."),
    }
}

pub fn sync_range(locale: AppLocale, start: &str, end: &str) -> String {
    match locale {
        AppLocale::Es => format!("Sincronizando del {start} al {end}"),
        AppLocale::Pt => format!("Sincronizando de {start} a {end}"),
        AppLocale::En => format!("Syncing {start} through {end}"),
    }
}

pub fn sync_refreshing_entries(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => "Ordenando las entradas locales de este tramo...",
        AppLocale::Pt => "Arrumando os registros locais deste trecho...",
        AppLocale::En => "Tidying local entries for this range...",
    }
}

pub fn sync_saving_timelogs(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => "Guardando las horas en la base local...",
        AppLocale::Pt => "Salvando as horas no banco local...",
        AppLocale::En => "Saving hours into the local database...",
    }
}

pub fn sync_saved_progress(locale: AppLocale, current: usize, total: usize) -> String {
    match locale {
        AppLocale::Es => format!("Ya van {current}/{total} entradas guardadas..."),
        AppLocale::Pt => format!("Já foram {current}/{total} entradas salvas..."),
        AppLocale::En => format!("{current}/{total} entries tucked away..."),
    }
}

pub fn sync_saved_summary(locale: AppLocale, entries: u32, issues: u32, projects: u32) -> String {
    match locale {
        AppLocale::Es => format!(
            "Quedaron guardadas {entries} entradas, {issues} incidencias y {projects} proyectos."
        ),
        AppLocale::Pt => {
            format!("Ficaram salvas {entries} entradas, {issues} itens e {projects} projetos.")
        }
        AppLocale::En => {
            format!("Saved {entries} entries, {issues} issues, and {projects} projects.")
        }
    }
}

pub fn sync_rebuilding_buckets(locale: AppLocale, start: &str, end: &str) -> String {
    match locale {
        AppLocale::Es => format!("Reacomodando los bloques diarios del {start} al {end}..."),
        AppLocale::Pt => format!("Reorganizando os blocos diários de {start} a {end}..."),
        AppLocale::En => format!("Rebuilding daily buckets from {start} to {end}..."),
    }
}

pub fn sync_complete(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => "Sincronización lista. Todo en su sitio.",
        AppLocale::Pt => "Sincronização concluída. Tudo no lugar.",
        AppLocale::En => "Sync complete. Everything is back in place.",
    }
}

pub fn audit_under_target_title(locale: AppLocale, date_label: &str) -> String {
    match locale {
        AppLocale::Es => format!("{date_label} se quedó corto frente a la meta"),
        AppLocale::Pt => format!("{date_label} ficou curto em relação à meta"),
        AppLocale::En => format!("{date_label} landed short of the target"),
    }
}

pub fn audit_under_target_detail(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => "Ese día cerró con menos horas de las que tocaban.",
        AppLocale::Pt => "Esse dia fechou com menos horas do que o planejado.",
        AppLocale::En => "That day wrapped up with fewer hours than planned.",
    }
}

pub fn audit_non_workday_title(locale: AppLocale, date_label: &str) -> String {
    match locale {
        AppLocale::Es => format!("{date_label} movió horas en feriado o día libre"),
        AppLocale::Pt => format!("{date_label} registrou horas em feriado ou dia livre"),
        AppLocale::En => format!("{date_label} logged time on a holiday or day off"),
    }
}

pub fn audit_non_workday_detail(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => "Vale la pena revisar esas entradas por si eran horas opcionales o algo quedó raro.",
        AppLocale::Pt => "Vale revisar esses registros para confirmar se eram horas opcionais ou se algo ficou estranho.",
        AppLocale::En => "Worth a quick check to confirm those hours were intentional.",
    }
}

pub fn audit_over_target_title(locale: AppLocale, date_label: &str) -> String {
    match locale {
        AppLocale::Es => format!("{date_label} se fue por encima de la meta"),
        AppLocale::Pt => format!("{date_label} passou da meta"),
        AppLocale::En => format!("{date_label} ran over the target"),
    }
}

pub fn audit_over_target_detail(locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => {
            "Puede haber horas de más, duplicados o un registro que se estiró demasiado."
        }
        AppLocale::Pt => "Pode haver excesso, duplicidade ou algum registro comprido demais.",
        AppLocale::En => {
            "There may be overflow, duplicates, or one entry that stretched a bit too far."
        }
    }
}

pub fn diagnostics_open_settings_error(locale: AppLocale, platform: &str) -> String {
    match (locale, platform) {
        (AppLocale::Es, "macos") => {
            "No pude abrir los ajustes de notificaciones de macOS".to_string()
        }
        (AppLocale::Es, "windows") => {
            "No pude abrir los ajustes de notificaciones de Windows".to_string()
        }
        (AppLocale::Es, "linux") => {
            "No pude abrir los ajustes de notificaciones en este entorno de Linux".to_string()
        }
        (AppLocale::Es, _) => {
            "Abrir los ajustes de notificaciones no está disponible en esta plataforma".to_string()
        }
        (AppLocale::Pt, "macos") => {
            "Não consegui abrir as configurações de notificações do macOS".to_string()
        }
        (AppLocale::Pt, "windows") => {
            "Não consegui abrir as configurações de notificações do Windows".to_string()
        }
        (AppLocale::Pt, "linux") => {
            "Não consegui abrir as configurações de notificações neste ambiente Linux".to_string()
        }
        (AppLocale::Pt, _) => {
            "Abrir as configurações de notificações não está disponível nesta plataforma"
                .to_string()
        }
        (AppLocale::En, "macos") => "I couldn't open macOS notification settings".to_string(),
        (AppLocale::En, "windows") => "I couldn't open Windows notification settings".to_string(),
        (AppLocale::En, "linux") => {
            "I couldn't open notification settings on this Linux desktop environment".to_string()
        }
        (AppLocale::En, _) => {
            "Opening notification settings is not available on this platform".to_string()
        }
    }
}

fn weekday_long(date: NaiveDate, locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => match date.weekday().num_days_from_monday() {
            0 => "lunes",
            1 => "martes",
            2 => "miércoles",
            3 => "jueves",
            4 => "viernes",
            5 => "sábado",
            _ => "domingo",
        },
        AppLocale::Pt => match date.weekday().num_days_from_monday() {
            0 => "segunda-feira",
            1 => "terça-feira",
            2 => "quarta-feira",
            3 => "quinta-feira",
            4 => "sexta-feira",
            5 => "sábado",
            _ => "domingo",
        },
        AppLocale::En => match date.weekday().num_days_from_monday() {
            0 => "Monday",
            1 => "Tuesday",
            2 => "Wednesday",
            3 => "Thursday",
            4 => "Friday",
            5 => "Saturday",
            _ => "Sunday",
        },
    }
}

fn month_short(date: NaiveDate, locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => match date.month() {
            1 => "ene",
            2 => "feb",
            3 => "mar",
            4 => "abr",
            5 => "may",
            6 => "jun",
            7 => "jul",
            8 => "ago",
            9 => "sep",
            10 => "oct",
            11 => "nov",
            _ => "dic",
        },
        AppLocale::Pt => match date.month() {
            1 => "jan",
            2 => "fev",
            3 => "mar",
            4 => "abr",
            5 => "mai",
            6 => "jun",
            7 => "jul",
            8 => "ago",
            9 => "set",
            10 => "out",
            11 => "nov",
            _ => "dez",
        },
        AppLocale::En => match date.month() {
            1 => "Jan",
            2 => "Feb",
            3 => "Mar",
            4 => "Apr",
            5 => "May",
            6 => "Jun",
            7 => "Jul",
            8 => "Aug",
            9 => "Sep",
            10 => "Oct",
            11 => "Nov",
            _ => "Dec",
        },
    }
}

fn month_long(date: NaiveDate, locale: AppLocale) -> &'static str {
    match locale {
        AppLocale::Es => match date.month() {
            1 => "enero",
            2 => "febrero",
            3 => "marzo",
            4 => "abril",
            5 => "mayo",
            6 => "junio",
            7 => "julio",
            8 => "agosto",
            9 => "septiembre",
            10 => "octubre",
            11 => "noviembre",
            _ => "diciembre",
        },
        AppLocale::Pt => match date.month() {
            1 => "janeiro",
            2 => "fevereiro",
            3 => "março",
            4 => "abril",
            5 => "maio",
            6 => "junho",
            7 => "julho",
            8 => "agosto",
            9 => "setembro",
            10 => "outubro",
            11 => "novembro",
            _ => "dezembro",
        },
        AppLocale::En => match date.month() {
            1 => "January",
            2 => "February",
            3 => "March",
            4 => "April",
            5 => "May",
            6 => "June",
            7 => "July",
            8 => "August",
            9 => "September",
            10 => "October",
            11 => "November",
            _ => "December",
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_spanish_day_chip() {
        let date = NaiveDate::from_ymd_opt(2026, 3, 25).unwrap();
        assert_eq!(format_day_chip(date, AppLocale::Es), "mié 25");
    }

    #[test]
    fn formats_portuguese_week_label() {
        let date = NaiveDate::from_ymd_opt(2026, 3, 2).unwrap();
        assert_eq!(format_week_label(date, AppLocale::Pt), "Semana de 02 mar");
    }
}
