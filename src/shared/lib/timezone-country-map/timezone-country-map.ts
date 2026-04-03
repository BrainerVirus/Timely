import { TIMEZONE_TO_PRIMARY_TERRITORY_A_TO_M } from "@/shared/lib/timezone-country-map/timezone-country-map-a-to-m";
import { TIMEZONE_TO_PRIMARY_TERRITORY_N_TO_Z } from "@/shared/lib/timezone-country-map/timezone-country-map-n-to-z";

export const TIMEZONE_TO_PRIMARY_TERRITORY: Record<string, string> = {
  ...TIMEZONE_TO_PRIMARY_TERRITORY_A_TO_M,
  ...TIMEZONE_TO_PRIMARY_TERRITORY_N_TO_Z,
};
