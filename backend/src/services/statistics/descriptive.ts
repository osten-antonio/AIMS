import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson, dataPreview, sortedPreview } from "./utils";

export function descriptiveStatsWithSteps(values: number[]): CalculationResult {
  const value = math.descriptiveStats(values);
  const n = value.n;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = value.mean;
  const median = value.median;
  const modeArr: number[] = value.mode ?? [];
  const min = value.min;
  const max = value.max;
  const range = value.range;

  const deviations = values.map((x) => x - mean);
  const squaredDeviations = deviations.map((d) => d * d);
  const sumSquaredDev = squaredDeviations.reduce((s, v) => s + v, 0);
  const populationVariance = value.populationVariance;
  const sampleVariance = value.sampleVariance;
  const populationSD = value.populationStdDev;
  const sampleSD = value.sampleStdDev;

  const sumExpansion =
    values.length <= 10 ? values.join(" + ") : dataPreview(values, 6) + " + ...";

  const devExamples: string[] = [];
  for (let i = 0; i < Math.min(3, values.length); i++) {
    devExamples.push(`(${fmt(values[i]!)} - ${fmt(mean)})^2 = ${fmt(squaredDeviations[i]!)}`);
  }
  if (values.length > 3) devExamples.push("...");

  let medianExplanation: string;
  if (n % 2 === 0) {
    const mid = n / 2;
    medianExplanation = `n = ${n} (even), so median = average of positions ${mid} and ${mid + 1}: (${sorted[mid - 1]} + ${sorted[mid]}) / 2 = ${fmt(median)}`;
  } else {
    const mid = Math.floor(n / 2) + 1;
    medianExplanation = `n = ${n} (odd), so median = value at position ${mid} = ${fmt(median)}`;
  }

  let modeDescription: string;
  if (modeArr.length === 0) {
    modeDescription = "No mode (all values appear once)";
  } else if (modeArr.length === 1) {
    modeDescription = `Mode = ${modeArr[0]} (appears most frequently)`;
  } else {
    modeDescription = `Multimodal: {${modeArr.join(", ")}} (these values appear most frequently)`;
  }

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify the Data Set",
      description: `Data: {${dataPreview(values)}}`,
      note: `n = ${n} (number of observations)`,
    },
    {
      id: "sum",
      title: "Calculate the Sum (\\Sigma x)",
      formula: "\\Sigma x = x_1 + x_2 + ... + x_n",
      calculation: `\\Sigma x = ${sumExpansion} = ${fmt(sum)}`,
      result: fmt(sum),
    },
    {
      id: "mean",
      title: "Calculate the Mean (\\bar{x})",
      formula: "\\bar{x} = \\frac{\\Sigma x}{n}",
      calculation: `\\bar{x} = \\frac{${fmt(sum)}}{${n}} = ${fmt(mean)}`,
      result: fmt(mean),
    },
    {
      id: "median",
      title: "Calculate the Median",
      description: `Sorted data: {${sortedPreview(values, 10)}}`,
      note: medianExplanation,
      result: fmt(median),
    },
    {
      id: "mode",
      title: "Find the Mode",
      description: modeDescription,
      result: modeArr.length > 0 ? modeArr.join(", ") : "No mode",
    },
    {
      id: "range",
      title: "Calculate Range",
      description: `Min = ${fmt(min)}, Max = ${fmt(max)}`,
      formula: "Range = Max - Min",
      calculation: `Range = ${fmt(max)} - ${fmt(min)} = ${fmt(range)}`,
      result: fmt(range),
    },
    {
      id: "variance-setup",
      title: "Calculate Squared Deviations",
      formula: "(x_i - \\bar{x})^2",
      description: devExamples.join("\n"),
      note: `\\Sigma(x_i - \\bar{x})^2 = ${fmt(sumSquaredDev)}`,
    },
    {
      id: "variance-population",
      title: "Population Variance (\\sigma^2)",
      formula: "\\sigma^2 = \\frac{\\Sigma(x_i - \\bar{x})^2}{n}",
      calculation: `\\sigma^2 = \\frac{${fmt(sumSquaredDev)}}{${n}} = ${fmt(populationVariance)}`,
      result: fmt(populationVariance),
      note: "Use when data represents entire population",
    },
    {
      id: "variance-sample",
      title: "Sample Variance (s^2)",
      formula: "s^2 = \\frac{\\Sigma(x_i - \\bar{x})^2}{n - 1}",
      calculation: n > 1
        ? `s^2 = \\frac{${fmt(sumSquaredDev)}}{${n} - 1} = \\frac{${fmt(sumSquaredDev)}}{${n - 1}} = ${fmt(sampleVariance)}`
        : "Cannot calculate (n = 1)",
      result: n > 1 ? fmt(sampleVariance) : "N/A",
      note: "Use when data is a sample from a larger population (Bessel's correction)",
    },
    {
      id: "sd-population",
      title: "Population Standard Deviation (\\sigma)",
      formula: "\\sigma = \\sqrt{\\sigma^2}",
      calculation: `\\sigma = \\sqrt{${fmt(populationVariance)}} = ${fmt(populationSD)}`,
      result: fmt(populationSD),
    },
    {
      id: "sd-sample",
      title: "Sample Standard Deviation (s)",
      formula: "s = \\sqrt{s^2}",
      calculation: n > 1
        ? `s = \\sqrt{${fmt(sampleVariance)}} = ${fmt(sampleSD)}`
        : "Cannot calculate (n = 1)",
      result: n > 1 ? fmt(sampleSD) : "N/A",
    },
    {
      id: "summary",
      title: "Summary of Results",
      description: [
        `n = ${n}`,
        `\\Sigma x = ${fmt(sum)}`,
        `Mean (\\bar{x}) = ${fmt(mean)}`,
        `Median = ${fmt(median)}`,
        `Mode = ${modeArr.length > 0 ? modeArr.join(", ") : "No mode"}`,
        `Range = ${fmt(range)} (Min: ${fmt(min)}, Max: ${fmt(max)})`,
        `Population Variance (\\sigma^2) = ${fmt(populationVariance)}`,
        `Sample Variance (s^2) = ${fmt(sampleVariance)}`,
        `Population SD (\\sigma) = ${fmt(populationSD)}`,
        `Sample SD (s) = ${fmt(sampleSD)}`,
      ].join("\n"),
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "descriptive" };
}
