import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson } from "./utils";

export function goodnessOfFitWithSteps(observed: number[], expected: number[], alpha = 0.05): CalculationResult {
  const value = math.goodnessOfFit(observed, expected, alpha);
  const k = observed.length;

  const contributions: number[] = [];
  const contributionDetails: string[] = [];
  for (let i = 0; i < k; i++) {
    const o = observed[i]!;
    const e = expected[i]!;
    const diff = o - e;
    const contrib = (diff * diff) / e;
    contributions.push(contrib);
    contributionDetails.push(
      `Category ${i + 1}: \\frac{(${o} - ${fmt(e)})^2}{${fmt(e)}} = \\frac{${fmt(diff * diff)}}{${fmt(e)}} = ${fmt(contrib)}`
    );
  }

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify the Hypothesis Test",
      description: [
        `H_0: The observed frequencies match the expected frequencies`,
        `H_1: The observed frequencies do not match the expected frequencies`,
        `\\alpha = ${alpha} (significance level)`,
        `k = ${k} (number of categories)`,
      ].join("\n"),
    },
    {
      id: "data",
      title: "State the Data",
      description: [
        `Observed: [${observed.join(", ")}]`,
        `Expected: [${expected.map((e) => fmt(e)).join(", ")}]`,
      ].join("\n"),
    },
    {
      id: "formula",
      title: "State the Chi-Square Formula",
      formula: "\\chi^2 = \\sum_{i=1}^{k} \\frac{(O_i - E_i)^2}{E_i}",
    },
    {
      id: "contributions",
      title: "Calculate Each Category's Contribution",
      description: contributionDetails.join("\n"),
    },
    {
      id: "sum",
      title: "Sum All Contributions",
      calculation: `\\chi^2 = ${contributions.map((c) => fmt(c)).join(" + ")} = ${fmt(value.chiSquare)}`,
      result: fmt(value.chiSquare),
    },
    {
      id: "df",
      title: "Calculate Degrees of Freedom",
      calculation: `df = k - 1 = ${k} - 1 = ${value.df}`,
      result: String(value.df),
    },
    {
      id: "critical",
      title: "Find Critical Value",
      description: `For \\alpha = ${alpha}, df = ${value.df}`,
      result: value.chiCritical !== null ? `\\chi^2\\text{-critical} = ${fmt(value.chiCritical)}` : "Not in table",
    },
    {
      id: "decision",
      title: "Make Decision",
      description: value.chiCritical !== null
        ? `\\chi^2 = ${fmt(value.chiSquare)} ${value.reject ? ">" : "\\le"} ${fmt(value.chiCritical)} = \\chi^2\\text{-critical}`
        : "Cannot determine",
      result: value.reject ? "Reject H_0" : "Fail to reject H_0",
      note: value.reject
        ? `The observed frequencies significantly differ from expected at \\alpha = ${alpha}.`
        : `There is insufficient evidence that observed differs from expected at \\alpha = ${alpha}.`,
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "goodness-of-fit", inputs: { alpha } };
}

export function chiSquareIndependenceWithSteps(table: number[][], alpha = 0.05): CalculationResult {
  const value = math.chiSquareIndependence(table, alpha);
  const rows = table.length;
  const cols = table[0]?.length ?? 0;

  const rowTotals = table.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = [];
  for (let c = 0; c < cols; c++) {
    let sum = 0;
    for (let r = 0; r < rows; r++) sum += table[r]![c]!;
    colTotals.push(sum);
  }
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  const expectedTable: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push((rowTotals[r]! * colTotals[c]!) / grandTotal);
    }
    expectedTable.push(row);
  }

  let chiSquare = 0;
  const cellCalcs: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const o = table[r]![c]!;
      const e = expectedTable[r]![c]!;
      const contrib = Math.pow(o - e, 2) / e;
      chiSquare += contrib;
      if (cellCalcs.length < 6) {
        cellCalcs.push(`Cell(${r + 1},${c + 1}): (${o}-${fmt(e, 2)})^2/${fmt(e, 2)} = ${fmt(contrib)}`);
      }
    }
  }
  if (rows * cols > 6) cellCalcs.push("...");

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify the Hypothesis Test",
      description: [
        `H_0: The variables are independent`,
        `H_1: The variables are not independent`,
        `\\alpha = ${alpha} (significance level)`,
        `Table size: ${rows} rows \\times ${cols} columns`,
      ].join("\n"),
    },
    {
      id: "totals",
      title: "Calculate Marginal Totals",
      description: [
        `Row totals: [${rowTotals.join(", ")}]`,
        `Column totals: [${colTotals.join(", ")}]`,
        `Grand total: ${grandTotal}`,
      ].join("\n"),
    },
    {
      id: "expected",
      title: "Calculate Expected Frequencies",
      formula: "E_{rc} = \\frac{(\\text{Row Total})(\\text{Column Total})}{\\text{Grand Total}}",
      description: expectedTable.map((row, r) => `Row ${r + 1}: [${row.map((e) => fmt(e, 2)).join(", ")}]`).join("\n"),
    },
    {
      id: "formula",
      title: "State the Chi-Square Formula",
      formula: "\\chi^2 = \\sum_{\\text{all cells}} \\frac{(O - E)^2}{E}",
    },
    {
      id: "calculations",
      title: "Calculate Chi-Square Contributions",
      description: cellCalcs.join("\n"),
      result: `\\chi^2 = ${fmt(chiSquare)}`,
    },
    {
      id: "df",
      title: "Calculate Degrees of Freedom",
      calculation: `df = (rows - 1)(cols - 1) = (${rows} - 1)(${cols} - 1) = ${value.df}`,
      result: String(value.df),
    },
    {
      id: "critical",
      title: "Find Critical Value",
      description: `For \\alpha = ${alpha}, df = ${value.df}`,
      result: value.chiCritical !== null ? `\\chi^2\\text{-critical} = ${fmt(value.chiCritical)}` : "Not in table",
    },
    {
      id: "decision",
      title: "Make Decision",
      description: value.chiCritical !== null
        ? `\\chi^2 = ${fmt(chiSquare)} ${value.reject ? ">" : "\\le"} ${fmt(value.chiCritical)} = \\chi^2\\text{-critical}`
        : "Cannot determine",
      result: value.reject ? "Reject H_0" : "Fail to reject H_0",
      note: value.reject
        ? `The variables are NOT independent at \\alpha = ${alpha}. There is a significant association.`
        : `There is insufficient evidence of association between variables at \\alpha = ${alpha}.`,
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "chi-square-independence", inputs: { alpha } };
}
