import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson } from "./utils";

export function linearRegressionWithSteps(xValues: number[], yValues: number[], alpha = 0.05): CalculationResult {
  const value = math.linearRegression(xValues, yValues, alpha);

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i]!, 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
  const sumY2 = yValues.reduce((acc, y) => acc + y * y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  const slopeNumerator = n * sumXY - sumX * sumY;
  const slopeDenominator = n * sumX2 - sumX * sumX;
  const intercept = value.intercept;
  const slope = value.slope;

  const rNumerator = n * sumXY - sumX * sumY;
  const rDenomLeft = n * sumX2 - sumX * sumX;
  const rDenomRight = n * sumY2 - sumY * sumY;
  const rDenominator = Math.sqrt(rDenomLeft * rDenomRight);
  const r = value.r;
  const rSquared = value.rSquared;

  const sst = yValues.reduce((acc, y) => acc + Math.pow(y - meanY, 2), 0);
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * xValues[i]!;
    sse += (yValues[i]! - yHat) ** 2;
  }
  const ssr = sst - sse;

  const df = n - 2;
  const standardErrorEstimate = df > 0 ? Math.sqrt(sse / df) : 0;
  const ssX = sumX2 - (sumX * sumX) / n;
  const standardErrorSlope = ssX > 0 ? standardErrorEstimate / Math.sqrt(ssX) : 0;
  const tStatistic = value.tStatistic;
  const tCritical = value.tCritical;
  const isSignificant = value.isSignificant;

  const dataTable = xValues.slice(0, 8).map((x, i) => {
    const y = yValues[i]!;
    return `| ${fmt(x, 2)} | ${fmt(y, 2)} | ${fmt(x * x, 2)} | ${fmt(y * y, 2)} | ${fmt(x * y, 2)} |`;
  });

  const interceptSign = intercept >= 0 ? "+" : "-";
  const equation = `\\hat{y} = ${fmt(slope)}x ${interceptSign} ${fmt(Math.abs(intercept))}`;

  let interpretation = "";
  const absR = Math.abs(r);
  if (absR >= 0.9) interpretation = "Very strong";
  else if (absR >= 0.7) interpretation = "Strong";
  else if (absR >= 0.5) interpretation = "Moderate";
  else if (absR >= 0.3) interpretation = "Weak";
  else interpretation = "Very weak or no";

  const steps: CalculationStep[] = [
    {
      id: "data",
      title: "Step 1: Identify the Data",
      description: [
        `n = ${n} (number of data points)`,
        `X: [${xValues.slice(0, 8).map(v => fmt(v, 2)).join(", ")}${xValues.length > 8 ? ", ..." : ""}]`,
        `Y: [${yValues.slice(0, 8).map(v => fmt(v, 2)).join(", ")}${yValues.length > 8 ? ", ..." : ""}]`,
      ].join("\n"),
    },
    {
      id: "table",
      title: "Step 2: Create Data Table",
      description: [
        "Calculate X^2, Y^2, and XY for each data point:",
        "",
        "| X | Y | X^2 | Y^2 | XY |",
        "|---|---|----|----|-----|",
        ...dataTable,
        xValues.length > 8 ? "| ... | ... | ... | ... | ... |" : "",
        `| **\\Sigma = ${fmt(sumX)}** | **${fmt(sumY)}** | **${fmt(sumX2)}** | **${fmt(sumY2)}** | **${fmt(sumXY)}** |`,
      ].filter(Boolean).join("\n"),
    },
    {
      id: "sums",
      title: "Step 3: Calculate Sums and Means",
      description: [
        `\\Sigma x = ${fmt(sumX)}`,
        `\\Sigma y = ${fmt(sumY)}`,
        `\\Sigma x^2 = ${fmt(sumX2)}`,
        `\\Sigma y^2 = ${fmt(sumY2)}`,
        `\\Sigma xy = ${fmt(sumXY)}`,
        ``,
        `\\bar{x} = \\Sigma x / n = ${fmt(sumX)}/${n} = ${fmt(meanX)}`,
        `\\bar{y} = \\Sigma y / n = ${fmt(sumY)}/${n} = ${fmt(meanY)}`,
      ].join("\n"),
    },
    {
      id: "slope-formula",
      title: "Step 4: Calculate Slope (b)",
      formula: "b = \\frac{n\\Sigma xy - \\Sigma x \\cdot \\Sigma y}{n\\Sigma x^2 - (\\Sigma x)^2}",
    },
    {
      id: "slope-calc",
      title: "Substitute Values for Slope",
      calculation: `b = \\frac{(${n})(${fmt(sumXY)}) - (${fmt(sumX)})(${fmt(sumY)})}{(${n})(${fmt(sumX2)}) - (${fmt(sumX)})^2}`,
      note: `b = \\frac{${fmt(slopeNumerator)}}{${fmt(slopeDenominator)}}`,
      result: fmt(slope),
    },
    {
      id: "intercept-formula",
      title: "Step 5: Calculate Intercept (a)",
      formula: "a = \\bar{y} - b\\bar{x}",
    },
    {
      id: "intercept-calc",
      title: "Substitute Values for Intercept",
      calculation: `a = ${fmt(meanY)} - (${fmt(slope)})(${fmt(meanX)})`,
      result: fmt(intercept),
    },
    {
      id: "equation",
      title: "Step 6: Write the Regression Equation",
      formula: equation,
      result: `\\hat{y} = ${fmt(slope)}x ${interceptSign} ${fmt(Math.abs(intercept))}`,
    },
    {
      id: "r-formula",
      title: "Step 7: Calculate Correlation Coefficient (r)",
      formula: "r = \\frac{n\\Sigma xy - \\Sigma x \\cdot \\Sigma y}{\\sqrt{[n\\Sigma x^2 - (\\Sigma x)^2][n\\Sigma y^2 - (\\Sigma y)^2]}}",
    },
    {
      id: "r-calc",
      title: "Calculate r",
      calculation: `r = \\frac{${fmt(rNumerator)}}{\\sqrt{(${fmt(rDenomLeft)})(${fmt(rDenomRight)})}}`,
      note: `r = \\frac{${fmt(rNumerator)}}{${fmt(rDenominator)}}`,
      result: fmt(r),
    },
    {
      id: "r-squared",
      title: "Step 8: Calculate Coefficient of Determination (r^2)",
      formula: "r^2 = r \\times r",
      calculation: `r^2 = (${fmt(r)})^2`,
      result: fmt(rSquared),
      note: `${fmt(rSquared * 100, 1)}% of the variance in Y is explained by X.`,
    },
    {
      id: "ss-partition",
      title: "Step 9: Partition Sum of Squares",
      description: [
        "SST (Total) = \\Sigma(y - \\bar{y})^2",
        "SSR (Regression) = \\Sigma(\\hat{y} - \\bar{y})^2",
        "SSE (Error) = \\Sigma(y - \\hat{y})^2",
        ``,
        `SST = ${fmt(sst)}`,
        `SSE = ${fmt(sse)}`,
        `SSR = SST - SSE = ${fmt(sst)} - ${fmt(sse)} = ${fmt(ssr)}`,
        ``,
        `Check: r^2 = SSR/SST = ${fmt(ssr)}/${fmt(sst)} = ${fmt(ssr / sst)}`,
      ].join("\n"),
    },
    {
      id: "se-estimate",
      title: "Step 10: Standard Error of the Estimate (s_e)",
      formula: "s_e = \\sqrt{\\frac{SSE}{n-2}} = \\sqrt{\\frac{\\Sigma(y - \\hat{y})^2}{n-2}}",
      calculation: `s_e = \\sqrt{\\frac{${fmt(sse)}}{${n} - 2}} = \\sqrt{\\frac{${fmt(sse)}}{${df}}}`,
      result: fmt(standardErrorEstimate),
    },
    {
      id: "se-slope",
      title: "Step 11: Standard Error of the Slope (s_b)",
      formula: "s_b = \\frac{s_e}{\\sqrt{SS_X}} = \\frac{s_e}{\\sqrt{\\Sigma x^2 - \\frac{(\\Sigma x)^2}{n}}}",
      calculation: `s_b = \\frac{${fmt(standardErrorEstimate)}}{\\sqrt{${fmt(sumX2)} - \\frac{(${fmt(sumX)})^2}{${n}}}} = \\frac{${fmt(standardErrorEstimate)}}{\\sqrt{${fmt(ssX)}}}`,
      result: fmt(standardErrorSlope),
    },
    {
      id: "hypothesis",
      title: "Step 12: Hypothesis Test for Slope",
      description: [
        `H_0: \\beta = 0 (no linear relationship)`,
        `H_1: \\beta \\neq 0 (linear relationship exists)`,
        ``,
        `\\alpha = ${alpha} (two-tailed)`,
        `df = n - 2 = ${n} - 2 = ${df}`,
      ].join("\n"),
      formula: "t = \\frac{b - 0}{s_b} = \\frac{b}{s_b}",
      calculation: `t = \\frac{${fmt(slope)}}{${fmt(standardErrorSlope)}}`,
      result: fmt(tStatistic),
      note: tCritical !== null
        ? `Critical\\ value\\ t_{${alpha / 2}, ${df}} = \\pm${fmt(tCritical)}`
        : `df=${df} not in table`,
    },
    {
      id: "decision",
      title: "Step 13: Decision",
      description: [
        `|t| = ${fmt(Math.abs(tStatistic))}`,
        tCritical !== null ? `t-critical = ${fmt(tCritical)}` : "",
        ``,
        isSignificant
          ? `Since |t| = ${fmt(Math.abs(tStatistic))} > ${fmt(tCritical!)}, we REJECT H_0.`
          : tCritical !== null
            ? `Since |t| = ${fmt(Math.abs(tStatistic))} \\le ${fmt(tCritical)}, we FAIL TO REJECT H_0.`
            : "Cannot determine significance without critical value.",
        ``,
        isSignificant
          ? "There IS a statistically significant linear relationship between X and Y."
          : "There is NO statistically significant linear relationship between X and Y.",
      ].filter(Boolean).join("\n"),
    },
    {
      id: "interpretation",
      title: "Step 14: Interpretation",
      description: [
        `Correlation (r) = ${fmt(r)}`,
        `Direction: ${r > 0 ? "Positive" : r < 0 ? "Negative" : "None"}`,
        `Strength: ${interpretation} correlation`,
        ``,
        `r^2 = ${fmt(rSquared)} \\rightarrow ${fmt(rSquared * 100, 1)}% of variance in Y is explained by X`,
        ``,
        `For every 1 unit increase in X, Y changes by ${fmt(slope)} units.`,
      ].join("\n"),
    },
    {
      id: "summary",
      title: "Summary",
      description: [
        `Regression Equation: \\hat{y} = ${fmt(slope)}x ${interceptSign} ${fmt(Math.abs(intercept))}`,
        ``,
        `Slope (b) = ${fmt(slope)}`,
        `Intercept (a) = ${fmt(intercept)}`,
        ``,
        `Correlation (r) = ${fmt(r)}`,
        `R-squared (r^2) = ${fmt(rSquared)} (${fmt(rSquared * 100, 1)}%)`,
        ``,
        `Standard Error of Estimate (s_e) = ${fmt(standardErrorEstimate)}`,
        `Standard Error of Slope (s_b) = ${fmt(standardErrorSlope)}`,
        `t-statistic = ${fmt(tStatistic)}`,
        ``,
        `Conclusion: The slope is ${isSignificant ? "" : "NOT "}statistically significant at \\alpha = ${alpha}.`,
      ].join("\n"),
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "linear-regression", inputs: { alpha } };
}
