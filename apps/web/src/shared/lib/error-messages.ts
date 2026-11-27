export type AppErrorKey =
  | "generic"
  | "network"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "rateLimited"
  | "serviceUnavailable"
  | "uploadFailed"
  | "titleTooShort"
  | "titleTooLong"
  | "descriptionTooLong"
  | "ingredientsMin"
  | "ingredientNameRequired"
  | "stepsMin"
  | "stepInstructionRequired";

const API_ERROR_CODE_MAP: Record<string, AppErrorKey> = {
  validation_failed: "validation",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  not_found: "notFound",
  rate_limited: "rateLimited",
  service_unavailable: "serviceUnavailable",
  internal_error: "generic",
  recipe_create_failed: "generic",
  recipe_fork_failed: "generic",
};

const VALIDATION_CODE_MAP: Record<string, AppErrorKey> = {
  title_too_short: "titleTooShort",
  title_too_long: "titleTooLong",
  description_too_long: "descriptionTooLong",
  ingredients_min: "ingredientsMin",
  ingredient_name_required: "ingredientNameRequired",
  steps_min: "stepsMin",
  step_instruction_required: "stepInstructionRequired",
};

/**
 * Maps an API error code or HTTP status to a localized `errors.*` dictionary key.
 * Never returns raw server messages to the UI.
 */
export function resolveClientErrorKey(code?: string | null, status?: number): AppErrorKey {
  if (code && code in API_ERROR_CODE_MAP) {
    return API_ERROR_CODE_MAP[code] as AppErrorKey;
  }

  switch (status) {
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "notFound";
    case 429:
      return "rateLimited";
    case 503:
      return "serviceUnavailable";
    default:
      return "generic";
  }
}

/**
 * Maps a Zod schema validation code to a localized `errors.*` dictionary key.
 */
export function resolveValidationErrorKey(code?: string): AppErrorKey {
  if (code && code in VALIDATION_CODE_MAP) {
    return VALIDATION_CODE_MAP[code] as AppErrorKey;
  }
  return "validation";
}
