import type { IngredientUnit, UnitSystem } from "./constants";

export interface ScalableIngredient {
  id?: string;
  groupName?: string | null;
  name: string;
  amount: number | null;
  unit: IngredientUnit;
  note?: string | null;
  isScalable: boolean;
}

export interface ScaledIngredientResult extends ScalableIngredient {
  scaledAmount: number | null;
  displayUnit: string;
  formattedAmount: string;
}

const FRACTIONS: ReadonlyArray<{ value: number; glyph: string }> = [
  { value: 1 / 8, glyph: "⅛" },
  { value: 1 / 4, glyph: "¼" },
  { value: 1 / 3, glyph: "⅓" },
  { value: 3 / 8, glyph: "⅜" },
  { value: 1 / 2, glyph: "½" },
  { value: 5 / 8, glyph: "⅝" },
  { value: 2 / 3, glyph: "⅔" },
  { value: 3 / 4, glyph: "¾" },
  { value: 7 / 8, glyph: "⅞" },
];

const FRACTION_TOLERANCE = 0.04;

export function formatAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  if (value >= 100) {
    return String(Math.round(value));
  }

  const whole = Math.floor(value);
  const remainder = value - whole;

  if (remainder < FRACTION_TOLERANCE) {
    return whole > 0 ? String(whole) : formatDecimal(value);
  }

  if (1 - remainder < FRACTION_TOLERANCE) {
    return String(whole + 1);
  }

  for (const fraction of FRACTIONS) {
    if (Math.abs(remainder - fraction.value) <= FRACTION_TOLERANCE) {
      return whole > 0 ? `${whole} ${fraction.glyph}` : fraction.glyph;
    }
  }

  return formatDecimal(value);
}

function formatDecimal(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(Number(rounded.toFixed(2)));
}

export function normalizeMetricUnit(
  amount: number,
  unit: IngredientUnit,
): { amount: number; unit: IngredientUnit } {
  if (unit === "g" && amount >= 1000) {
    return { amount: Number((amount / 1000).toFixed(2)), unit: "kg" };
  }
  if (unit === "kg" && amount > 0 && amount < 1) {
    return { amount: Number((amount * 1000).toFixed(1)), unit: "g" };
  }
  if (unit === "ml" && amount >= 1000) {
    return { amount: Number((amount / 1000).toFixed(2)), unit: "l" };
  }
  if (unit === "l" && amount > 0 && amount < 1) {
    return { amount: Number((amount * 1000).toFixed(1)), unit: "ml" };
  }
  return { amount, unit };
}

export function convertUnitSystem(
  amount: number,
  unit: IngredientUnit,
  targetSystem: UnitSystem,
): { amount: number; displayUnit: string } {
  if (targetSystem === "metric") {
    const normalized = normalizeMetricUnit(amount, unit);
    return { amount: normalized.amount, displayUnit: normalized.unit };
  }

  switch (unit) {
    case "g": {
      const oz = amount * 0.035274;
      if (oz >= 16) {
        return { amount: Number((oz / 16).toFixed(2)), displayUnit: "lb" };
      }
      return { amount: Number(oz.toFixed(2)), displayUnit: "oz" };
    }
    case "kg":
      return { amount: Number((amount * 2.20462).toFixed(2)), displayUnit: "lb" };
    case "ml":
      return { amount: Number((amount * 0.033814).toFixed(2)), displayUnit: "fl_oz" };
    case "l":
      return { amount: Number((amount * 33.814).toFixed(1)), displayUnit: "fl_oz" };
    default:
      return { amount, displayUnit: unit };
  }
}

export function scaleIngredient(
  ingredient: ScalableIngredient,
  baseServings: number,
  targetServings: number,
  unitSystem: UnitSystem = "metric",
): ScaledIngredientResult {
  if (ingredient.amount === null || !Number.isFinite(ingredient.amount) || ingredient.amount <= 0) {
    return {
      ...ingredient,
      scaledAmount: null,
      displayUnit: ingredient.unit,
      formattedAmount: "",
    };
  }

  const safeBase = baseServings > 0 ? baseServings : 1;
  const safeTarget = targetServings > 0 ? targetServings : safeBase;

  const rawScaled = ingredient.isScalable
    ? ingredient.amount * (safeTarget / safeBase)
    : ingredient.amount;

  const converted = convertUnitSystem(rawScaled, ingredient.unit, unitSystem);

  return {
    ...ingredient,
    scaledAmount: converted.amount,
    displayUnit: converted.displayUnit,
    formattedAmount: formatAmount(converted.amount),
  };
}

export function scaleRecipeIngredients(
  ingredients: readonly ScalableIngredient[],
  baseServings: number,
  targetServings: number,
  unitSystem: UnitSystem = "metric",
): ScaledIngredientResult[] {
  return ingredients.map((item) => scaleIngredient(item, baseServings, targetServings, unitSystem));
}
