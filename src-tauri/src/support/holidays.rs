use chrono::NaiveDate;
use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayCountryOption {
    pub code: String,
    pub label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayRegionOption {
    pub code: String,
    pub label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayPreviewItem {
    pub date: String,
    pub name: String,
}

#[derive(Clone, Copy)]
pub struct HolidayRecord {
    pub date: &'static str,
    pub name: &'static str,
    pub country_code: &'static str,
    pub region_code: Option<&'static str>,
}

const HOLIDAY_DATA: &[HolidayRecord] = &[
    HolidayRecord {
        date: "2026-01-01",
        name: "Ano Nuevo",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-04-03",
        name: "Viernes Santo",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-05-01",
        name: "Dia del Trabajador",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-09-18",
        name: "Independencia Nacional",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-09-19",
        name: "Glorias del Ejercito",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-12-25",
        name: "Navidad",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-07-16",
        name: "Virgen del Carmen",
        country_code: "CL",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-01-01",
        name: "New Year's Day",
        country_code: "US",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-07-04",
        name: "Independence Day",
        country_code: "US",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-12-25",
        name: "Christmas Day",
        country_code: "US",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-01-01",
        name: "Ano Nuevo",
        country_code: "AR",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-05-25",
        name: "Dia de la Revolucion de Mayo",
        country_code: "AR",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-07-09",
        name: "Dia de la Independencia",
        country_code: "AR",
        region_code: None,
    },
    HolidayRecord {
        date: "2026-12-25",
        name: "Navidad",
        country_code: "AR",
        region_code: None,
    },
];

const COUNTRY_OPTIONS: &[(&str, &str)] = &[
    ("AR", "Argentina"),
    ("AU", "Australia"),
    ("BR", "Brazil"),
    ("CA", "Canada"),
    ("CL", "Chile"),
    ("CO", "Colombia"),
    ("DE", "Germany"),
    ("ES", "Spain"),
    ("FR", "France"),
    ("GB", "United Kingdom"),
    ("IN", "India"),
    ("IT", "Italy"),
    ("JP", "Japan"),
    ("MX", "Mexico"),
    ("PE", "Peru"),
    ("PT", "Portugal"),
    ("US", "United States"),
    ("UY", "Uruguay"),
];

const REGION_OPTIONS: &[(&str, &[(&str, &str)])] = &[
    (
        "CL",
        &[
            ("all", "All regions"),
            ("AP", "Arica y Parinacota"),
            ("BI", "Biobio"),
            ("NU", "Nuble"),
            ("TA", "Tarapaca"),
        ],
    ),
    (
        "US",
        &[
            ("all", "All regions"),
            ("CA", "California"),
            ("FL", "Florida"),
            ("NY", "New York"),
            ("TX", "Texas"),
            ("WA", "Washington"),
        ],
    ),
    (
        "AR",
        &[
            ("all", "All regions"),
            ("B", "Buenos Aires"),
            ("C", "Ciudad Autonoma de Buenos Aires"),
            ("K", "Catamarca"),
            ("S", "Santa Fe"),
        ],
    ),
];

pub fn holiday_countries() -> Vec<HolidayCountryOption> {
    COUNTRY_OPTIONS
        .iter()
        .map(|(code, label)| HolidayCountryOption {
            code: (*code).to_string(),
            label: (*label).to_string(),
        })
        .collect()
}

pub fn holiday_regions(country_code: Option<&str>) -> Vec<HolidayRegionOption> {
    let Some(country_code) = country_code else {
        return vec![];
    };

    REGION_OPTIONS
        .iter()
        .find(|(code, _)| *code == country_code)
        .map(|(_, options)| {
            options
                .iter()
                .map(|(code, label)| HolidayRegionOption {
                    code: (*code).to_string(),
                    label: (*label).to_string(),
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn holiday_preview(
    country_code: Option<&str>,
    region_code: Option<&str>,
) -> Vec<HolidayPreviewItem> {
    let country = country_code.unwrap_or("CL");
    let normalized_region = match region_code {
        Some("all") | None => None,
        value => value,
    };

    HOLIDAY_DATA
        .iter()
        .filter(|record| {
            record.country_code == country
                && match (record.region_code, normalized_region) {
                    (None, _) => true,
                    (Some(expected), Some(actual)) => expected == actual,
                    (Some(_), None) => false,
                }
        })
        .take(8)
        .map(|record| HolidayPreviewItem {
            date: record.date.to_string(),
            name: record.name.to_string(),
        })
        .collect()
}

pub fn holiday_for_date(
    date: NaiveDate,
    country_code: Option<&str>,
    region_code: Option<&str>,
) -> Option<&'static HolidayRecord> {
    let country = country_code.unwrap_or("CL");

    HOLIDAY_DATA.iter().find(|record| {
        record.country_code == country
            && record.date == date.format("%Y-%m-%d").to_string()
            && match (record.region_code, region_code) {
                (None, _) => true,
                (Some(expected), Some(actual)) => expected == actual,
                (Some(_), None) => false,
            }
    })
}
