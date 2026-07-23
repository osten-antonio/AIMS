import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson } from "./utils";

export function boxPlotWithSteps(values: number[]): CalculationResult {
  const value = math.boxPlotSummary(values);
  const cleaned = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  const n = cleaned.length;
  const min = value.min;
  const q1 = value.q1;
  const median = value.median;
  const q3 = value.q3;
  const max = value.max;
  const iqr = value.iqr;
  const lowerFence = value.lowerFence;
  const upperFence = value.upperFence;
  const outliers = value.outliers;

  const nonOutliers = cleaned.filter(v => v >= lowerFence && v <= upperFence);
  const lowerWhisker = nonOutliers[0];
  const upperWhisker = nonOutliers[nonOutliers.length - 1];

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify the Data",
      description: `Data provided (${values.length} values). Using ${n} numeric value(s).`,
      result: n === values.length ? "All values valid" : `${n} valid number(s) found`,
    },
    {
      id: "sort",
      title: "Sort the Data",
      description: `Sorted values: {${cleaned.join(", ")}}`,
    },
    {
      id: "quartiles",
      title: "Compute Quartiles",
      description: `Q1 = ${fmt(q1)}, Median = ${fmt(median)}, Q3 = ${fmt(q3)}`,
      note: "Quartiles use Tukey's method (median of each half).",
    },
    {
      id: "iqr",
      title: "Interquartile Range (IQR)",
      formula: "IQR = Q3 - Q1",
      calculation: `IQR = ${fmt(q3)} - ${fmt(q1)} = ${fmt(iqr)}`,
      result: fmt(iqr),
    },
    {
      id: "fences",
      title: "Calculate Fences",
      formula: "\\text{Lower} = Q1 - 1.5 \\cdot IQR, \\quad \\text{Upper} = Q3 + 1.5 \\cdot IQR",
      calculation: `\\text{Lower fence} = ${fmt(q1)} - 1.5 \\cdot ${fmt(iqr)} = ${fmt(lowerFence)}\n\\text{Upper fence} = ${fmt(q3)} + 1.5 \\cdot ${fmt(iqr)} = ${fmt(upperFence)}`,
      result: `\\text{Lower} = ${fmt(lowerFence)}, \\text{Upper} = ${fmt(upperFence)}`,
    },
    {
      id: "whiskers",
      title: "Determine Whiskers",
      description: `Whiskers span from the first non-outlier (${fmt(lowerWhisker!)}) to the last non-outlier (${fmt(upperWhisker!)}).`,
      note: outliers.length > 0 ? `Outliers exist beyond fences: ${outliers.join(", ")}` : "No outliers detected.",
      result: `Whiskers: [${fmt(lowerWhisker!)}, ${fmt(upperWhisker!)}]`,
    },
    ...(outliers.length > 0 ? [{
      id: "outliers",
      title: "Identify Outliers",
      description: `Values beyond fences: {${outliers.join(", ")}}`,
      result: outliers.join(", "),
    }] : []),
    {
      id: "summary",
      title: "Five-Number Summary",
      description: `Min = ${fmt(min)}, Q1 = ${fmt(q1)}, Median = ${fmt(median)}, Q3 = ${fmt(q3)}, Max = ${fmt(max)}`,
      result: `IQR = ${fmt(iqr)}`,
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "box-plot" };
}

export function specialMeansWithSteps(values: number[], trimPercent?: number, trimCount?: number): CalculationResult {
  const value = math.specialMeans(values, trimPercent, trimCount);
  const sorted = [...values].sort((a, b) => a - b);
  const q = value.quartiles;
  const trimean = value.trimean;
  const geometricMean = value.geometricMean;
  const trimmedMean = value.trimmedMean;
  const trimPerSide = value.trimPerSide;

  const trimProp = sorted.length > 0 ? trimPerSide / sorted.length : 0;

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify the Data",
      description: `Received ${values.length} value(s); using ${sorted.length} valid number(s). Sorted: {${sorted.join(", ")}}`,
    },
    {
      id: "quartiles",
      title: "Quartiles",
      description: `Q1 = ${fmt(q.q1)}, Median = ${fmt(q.median)}, Q3 = ${fmt(q.q3)}`,
      note: "Quartiles via Tukey's method (median of each half).",
    },
    {
      id: "trimean",
      title: "Trimean",
      formula: "T = \\frac{Q_1 + 2M + Q_3}{4}",
      calculation: `T = \\frac{${fmt(q.q1)} + 2 \\cdot ${fmt(q.median)} + ${fmt(q.q3)}}{4} = ${fmt(trimean)}`,
      result: fmt(trimean),
    },
    ...(Number.isFinite(geometricMean) ? [{
      id: "geometric",
      title: "Geometric Mean",
      formula: "GM = \\left(\\prod x_i\\right)^{1/n}",
      note: "All values must be > 0.",
      result: fmt(geometricMean),
    }] : [{
      id: "geometric-error",
      title: "Geometric Mean",
      description: "Geometric mean needs all values > 0. No zeros, no negatives.",
      result: "N/A",
    }]),
    {
      id: "trimmed",
      title: "Trimmed Mean",
      description: trimPerSide > 0
        ? `Trimmed ${trimPerSide} value(s) from each tail (${fmt(trimProp * 100)}%). Remaining n = ${sorted.length - 2 * trimPerSide}.`
        : "No trimming applied (0 trimmed per side).",
      formula: "\\bar{x}_{trim} = \\frac{\\Sigma x_{trim}}{n_{trim}}",
      result: fmt(trimmedMean),
    },
  ];

  const inputs: Record<string, string | number> = {};
  if (typeof trimPercent !== "undefined") inputs.trimPercent = trimPercent;
  if (typeof trimCount !== "undefined") inputs.trimCount = trimCount;
  return { value: sanitizeForJson(value), steps, formula: "special-means", inputs };
}
