export type TimeCycle = "system" | "12h" | "24h";
export type ResolvedTimeCycle = Exclude<TimeCycle, "system">;
export type Segment = "hour" | "minute" | "period";

export interface TimeParts {
  hours24: number;
  minutes: number;
}

export interface DisplayParts {
  hour: string;
  minute: string;
  period: "AM" | "PM";
}

export interface DayPeriodLabels {
  am: string;
  pm: string;
}

export type DraftValue = {
  sourceValue: string;
  text: string;
};
