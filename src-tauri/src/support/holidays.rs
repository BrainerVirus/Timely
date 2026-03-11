use std::{collections::HashMap, sync::OnceLock};

use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayCountryOption {
    pub code: String,
    pub label: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayListItem {
    pub date: String,
    pub name: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HolidayYearData {
    pub country_code: String,
    pub year: i32,
    pub holidays: Vec<HolidayListItem>,
}

#[derive(Clone)]
pub struct HolidayRecord {
    pub name: String,
}

#[derive(Deserialize)]
struct HolidayDataset {
    countries: Vec<HolidayCountryOption>,
    holidays_by_country: HashMap<String, HashMap<String, Vec<HolidayListItem>>>,
}

static HOLIDAY_DATASET: OnceLock<HolidayDataset> = OnceLock::new();

pub fn holiday_countries() -> Vec<HolidayCountryOption> {
    dataset().countries.clone()
}

pub fn holiday_year(country_code: &str, year: i32) -> HolidayYearData {
    HolidayYearData {
        country_code: country_code.to_string(),
        year,
        holidays: dataset()
            .holidays_by_country
            .get(country_code)
            .and_then(|years| years.get(&year.to_string()))
            .cloned()
            .unwrap_or_default(),
    }
}

pub fn holiday_for_date(date: NaiveDate, country_code: Option<&str>) -> Option<HolidayRecord> {
    let country_code = country_code?;
    let year = date.year();
    let date_key = date.format("%Y-%m-%d").to_string();

    dataset()
        .holidays_by_country
        .get(country_code)
        .and_then(|years| years.get(&year.to_string()))
        .and_then(|holidays| {
            holidays
                .iter()
                .find(|holiday| holiday.date == date_key)
                .map(|holiday| HolidayRecord {
                    name: holiday.name.clone(),
                })
        })
}

fn dataset() -> &'static HolidayDataset {
    HOLIDAY_DATASET.get_or_init(|| {
        serde_json::from_str(include_str!("./holidays-data.json"))
            .expect("valid bundled holiday dataset")
    })
}
