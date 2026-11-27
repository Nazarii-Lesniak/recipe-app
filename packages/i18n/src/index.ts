import en from "./messages/en.json";
import uk from "./messages/uk.json";

export * from "./locales";

export const messagesByLocale = {
  uk,
  en,
} as const;

export type Messages = typeof uk;
export { en, uk };
