import { describe, expect, it } from "vitest";
import {
  formatAmount,
  normalizeMetricUnit,
  scaleIngredient,
  scaleRecipeIngredients,
} from "../portion-scaler";

describe("formatAmount", () => {
  it("formats sub-unit amounts as rounded decimals without fractions", () => {
    expect(formatAmount(0.25)).toBe("0.25");
    expect(formatAmount(0.5)).toBe("0.5");
    expect(formatAmount(0.75)).toBe("0.75");
    expect(formatAmount(0.333)).toBe("0.33");
    expect(formatAmount(1.333)).toBe("1.3");
    expect(formatAmount(2.667)).toBe("2.7");
  });

  it("formats integers and decimals cleanly", () => {
    expect(formatAmount(2)).toBe("2");
    expect(formatAmount(1.5)).toBe("1.5");
    expect(formatAmount(125.4)).toBe("125");
    expect(formatAmount(0)).toBe("");
    expect(formatAmount(Number.NaN)).toBe("");
  });
});

describe("normalizeMetricUnit", () => {
  it("auto-converts >= 1000 g to kg and >= 1000 ml to l", () => {
    expect(normalizeMetricUnit(1500, "g")).toEqual({ amount: 1.5, unit: "kg" });
    expect(normalizeMetricUnit(1000, "ml")).toEqual({ amount: 1, unit: "l" });
  });

  it("auto-converts < 1 kg/l down to g/ml", () => {
    expect(normalizeMetricUnit(0.5, "kg")).toEqual({ amount: 500, unit: "g" });
    expect(normalizeMetricUnit(0.25, "l")).toEqual({ amount: 250, unit: "ml" });
  });
});

describe("scaleIngredient & scaleRecipeIngredients", () => {
  it("scales scalable ingredients proportionally and normalizes metric units", () => {
    const scaled = scaleIngredient(
      { name: "Борошно", amount: 500, unit: "g", isScalable: true },
      2,
      6,
      "metric",
    );
    expect(scaled.scaledAmount).toBe(1.5);
    expect(scaled.displayUnit).toBe("kg");
    expect(scaled.formattedAmount).toBe("1.5");
  });

  it("preserves non-scalable ingredients unchanged", () => {
    const scaled = scaleIngredient(
      { name: "Сіль", amount: 1, unit: "tsp", isScalable: false },
      2,
      10,
      "metric",
    );
    expect(scaled.scaledAmount).toBe(1);
    expect(scaled.formattedAmount).toBe("1");
  });

  it("handles null amounts cleanly without NaN", () => {
    const scaled = scaleIngredient(
      { name: "Олія для смаження", amount: null, unit: "to_taste", isScalable: false },
      4,
      8,
    );
    expect(scaled.scaledAmount).toBeNull();
    expect(scaled.formattedAmount).toBe("");
  });

  it("converts metric units to imperial when requested", () => {
    const gToOz = scaleIngredient(
      { name: "Butter", amount: 100, unit: "g", isScalable: true },
      4,
      4,
      "imperial",
    );
    expect(gToOz.displayUnit).toBe("oz");
    expect(gToOz.scaledAmount).toBeCloseTo(3.53, 1);

    const mlToFlOz = scaleIngredient(
      { name: "Milk", amount: 250, unit: "ml", isScalable: true },
      4,
      4,
      "imperial",
    );
    expect(mlToFlOz.displayUnit).toBe("fl_oz");
    expect(mlToFlOz.scaledAmount).toBeCloseTo(8.45, 1);
  });

  it("scales an array of ingredients", () => {
    const result = scaleRecipeIngredients(
      [
        { name: "Milk", amount: 500, unit: "ml", isScalable: true },
        { name: "Pinch salt", amount: 1, unit: "pinch", isScalable: false },
      ],
      2,
      4,
    );
    expect(result[0]?.scaledAmount).toBe(1);
    expect(result[0]?.displayUnit).toBe("l");
    expect(result[1]?.scaledAmount).toBe(1);
  });
});
