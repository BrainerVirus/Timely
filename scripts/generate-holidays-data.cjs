const fs = require("fs");
const path = require("path");
const Holidays = require("date-holidays");

const START_YEAR = 2016;
const END_YEAR = 2031;

function main() {
  const years = [];
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    years.push(year);
  }

  const countries = Object.entries(new Holidays().getCountries("en"))
    .map(([code, label]) => ({ code, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));

  const holidaysByCountry = {};
  for (const { code } of countries) {
    const calendar = new Holidays(code);
    const byYear = {};

    for (const year of years) {
      const holidays = calendar
        .getHolidays(year)
        .filter((item) => item.type === "public")
        .map((item) => ({
          date: item.date.slice(0, 10),
          name: item.name,
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "en"));

      if (holidays.length > 0) {
        byYear[String(year)] = holidays;
      }
    }

    if (Object.keys(byYear).length > 0) {
      holidaysByCountry[code] = byYear;
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "date-holidays",
    years,
    countries,
    holidaysByCountry,
  };

  const filePath = path.join(process.cwd(), "src-tauri", "src", "support", "holidays-data.json");
  fs.writeFileSync(filePath, JSON.stringify(output));
  process.stdout.write(`Wrote ${filePath}\n`);
}

main();
