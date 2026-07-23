import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson } from "./utils";

export function oneWayAnovaWithSteps(groups: number[][]): CalculationResult {
  const value = math.oneWayAnova(groups);
  const k = groups.length;
  const all = groups.flat();
  const N = all.length;
  const grandMean = all.reduce((s, v) => s + v, 0) / N;

  const groupStats = groups.map((group, i) => {
    const sum = group.reduce((a, b) => a + b, 0);
    const n = group.length;
    const mean = n > 0 ? sum / n : 0;
    const sumSq = group.reduce((s, v) => s + v * v, 0);
    return { sum, mean, n, sumSq, label: String.fromCharCode(65 + i) };
  });

  const correctionFactor = Math.pow(all.reduce((s, v) => s + v, 0), 2) / N;
  const sumOfSquaresRaw = groupStats.reduce((s, g) => s + g.sumSq, 0);
  const totalSS = sumOfSquaresRaw - correctionFactor;

  let sumGroupSumSqDivN = 0;
  groupStats.forEach(g => {
    if (g.n > 0) sumGroupSumSqDivN += (g.sum * g.sum) / g.n;
  });
  const ssBetween = sumGroupSumSqDivN - correctionFactor;
  const ssWithin = totalSS - ssBetween;
  const dfBetween = value.dfBetween;
  const dfWithin = value.dfWithin;
  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const fStat = value.fStat;
  const fCritical = value.fCritical;

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify Groups",
      description: `k = ${k} groups, N = ${N} total observations`,
    },
    {
      id: "group-means",
      title: "Step 1: Group Means and Overall Mean",
      description: [
        `Grand Mean (\\bar{X}_{GM}) = ${fmt(grandMean)}`,
        ...groupStats.map(g => `Group ${g.label}: n = ${g.n}, \\bar{X}_{${g.label}} = ${fmt(g.mean)}`),
      ].join("\n"),
    },
    {
      id: "ss-total",
      title: "Step 2a: Sum of Squares Total",
      formula: "SS_{Total} = \\Sigma(X - \\bar{X}_{GM})^2 = \\Sigma X^2 - CF",
      calculation: `CF = \\frac{(\\Sigma X)^2}{N} = ${fmt(correctionFactor)}\nSS_{Total} = ${fmt(sumOfSquaresRaw)} - ${fmt(correctionFactor)} = ${fmt(totalSS)}`,
      result: fmt(totalSS),
    },
    {
      id: "ss-between",
      title: "Step 2b: Sum of Squares Between",
      formula: "SS_{Between} = \\Sigma \\frac{(\\Sigma X_i)^2}{n_i} - CF",
      calculation: groupStats.map(g =>
        `Group ${g.label}: \\frac{(${fmt(g.sum)})^2}{${g.n}} = ${fmt((g.sum * g.sum) / g.n)}`
      ).join("\n") + `\nSS_{Between} = ${fmt(sumGroupSumSqDivN)} - ${fmt(correctionFactor)} = ${fmt(ssBetween)}`,
      result: fmt(ssBetween),
    },
    {
      id: "ss-within",
      title: "Step 2c: Sum of Squares Within",
      formula: "SS_{Within} = SS_{Total} - SS_{Between}",
      calculation: `SS_{Within} = ${fmt(totalSS)} - ${fmt(ssBetween)} = ${fmt(ssWithin)}`,
      result: fmt(ssWithin),
    },
    {
      id: "ms-f",
      title: "Step 3: Mean Squares & F-Statistic",
      description: [
        `df_{between} = k - 1 = ${k} - 1 = ${dfBetween}`,
        `df_{within} = N - k = ${N} - ${k} = ${dfWithin}`,
        ``,
        `MS_{Between} = SS_{Between} / df_{between} = ${fmt(ssBetween)} / ${dfBetween} = ${fmt(msBetween)}`,
        `MS_{Within} = SS_{Within} / df_{within} = ${fmt(ssWithin)} / ${dfWithin} = ${fmt(msWithin)}`,
        ``,
        `F = MS_{Between} / MS_{Within} = ${fmt(msBetween)} / ${fmt(msWithin)} = ${fmt(fStat)}`,
      ].join("\n"),
      result: fmt(fStat),
    },
    {
      id: "decision",
      title: "Step 4: Hypothesis Test & Decision",
      description: [
        `H_0: \\mu_1 = \\mu_2 = ... = \\mu_k (all group means are equal)`,
        `H_1: At least one group mean differs`,
        ``,
        `F_{statistic} = ${fmt(fStat)}`,
        `F_{critical}(\\alpha = 0.05, df_1 = ${dfBetween}, df_2 = ${dfWithin}) = ${fCritical !== null ? fmt(fCritical) : "N/A"}`,
        ``,
        fCritical !== null
          ? (fStat > fCritical
            ? `F = ${fmt(fStat)} > F_{critical} = ${fmt(fCritical)} \\Rightarrow REJECT H_0`
            : `F = ${fmt(fStat)} \\le F_{critical} = ${fmt(fCritical)} \\Rightarrow FAIL TO REJECT H_0`)
          : "Cannot determine without critical value",
      ].join("\n"),
      result: fCritical !== null && fStat > fCritical ? "Reject H_0" : "Fail to reject H_0",
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "one-way-anova" };
}

export function twoWayAnovaWithSteps(data: number[][][]): CalculationResult {
  const value = math.twoWayAnova(data);
  const R = data.length;
  const C = data[0]?.length ?? 0;
  const n = data[0]?.[0]?.length ?? 0;
  const N = R * C * n;

  let grandSum = 0;
  const rowSums = new Array(R).fill(0);
  const colSums = new Array(C).fill(0);
  const cellSums: number[][] = Array.from({ length: R }, () => new Array(C).fill(0));

  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      for (let k = 0; k < n; k++) {
        const val = data[i]![j]![k]!;
        grandSum += val;
        rowSums[i]! += val;
        colSums[j]! += val;
        cellSums[i]![j]! += val;
      }
    }
  }

  const grandMean = grandSum / N;
  const rowMeans = rowSums.map(s => s / (C * n));
  const colMeans = colSums.map(s => s / (R * n));
  const cellMeans = cellSums.map(row => row.map(s => s / n));

  let ssTotal = 0;
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      for (let k = 0; k < n; k++) {
        ssTotal += Math.pow(data[i]![j]![k]! - grandMean, 2);
      }
    }
  }

  let ssRow = 0;
  for (let i = 0; i < R; i++) ssRow += (C * n) * Math.pow(rowMeans[i]! - grandMean, 2);

  let ssCol = 0;
  for (let j = 0; j < C; j++) ssCol += (R * n) * Math.pow(colMeans[j]! - grandMean, 2);

  let ssError = 0;
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      for (let k = 0; k < n; k++) {
        ssError += Math.pow(data[i]![j]![k]! - cellMeans[i]![j]!, 2);
      }
    }
  }

  const ssInter = ssTotal - ssRow - ssCol - ssError;
  const dfRow = value.dfRow;
  const dfCol = value.dfCol;
  const dfInter = value.dfInter;
  const dfError = value.dfError;
  const dfTotal = N - 1;

  const msRow = ssRow / dfRow;
  const msCol = ssCol / dfCol;
  const msInter = ssInter / dfInter;
  const msError = dfError > 0 ? ssError / dfError : 0;

  const fRow = value.fRow;
  const fCol = value.fCol;
  const fInter = value.fInter;

  const makeDecision = (f: number, fCrit: number | null, name: string) => {
    if (fCrit === null) return `${name}: Cannot determine`;
    return f > fCrit
      ? `${name}: REJECT H_0 (F = ${fmt(f)} > F_{crit} = ${fmt(fCrit)})`
      : `${name}: FAIL TO REJECT H_0 (F = ${fmt(f)} \\le F_{crit} = ${fmt(fCrit)})`;
  };

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify Layout",
      description: `Rows (Factor A) = ${R}, Columns (Factor B) = ${C}, Replicates = ${n}, Total N = ${N}`,
    },
    {
      id: "df",
      title: "Step 1: Compute Degrees of Freedom",
      description: [
        `df_{Factor A} = R - 1 = ${R} - 1 = ${dfRow}`,
        `df_{Factor B} = C - 1 = ${C} - 1 = ${dfCol}`,
        `df_{Interaction} = (R-1)(C-1) = ${dfRow} \\times ${dfCol} = ${dfInter}`,
        `df_{Error} = RC(n-1) = ${R}\\times${C}\\times${n - 1} = ${dfError}`,
        `df_{Total} = N - 1 = ${N} - 1 = ${dfTotal}`,
      ].join("\n"),
    },
    {
      id: "means",
      title: "Step 2: Calculate Means",
      description: [
        `Grand Mean = ${fmt(grandMean)}`,
        `Row Means: ${rowMeans.map((m, i) => `R${i + 1} = ${fmt(m)}`).join(", ")}`,
        `Column Means: ${colMeans.map((m, j) => `C${j + 1} = ${fmt(m)}`).join(", ")}`,
      ].join("\n"),
    },
    {
      id: "ss",
      title: "Step 3: Compute Sum of Squares (Deviation Method)",
      description: [
        `SS_{Factor A} = ${fmt(ssRow)}`,
        `SS_{Factor B} = ${fmt(ssCol)}`,
        `SS_{Error} = ${fmt(ssError)}`,
        `SS_{Total} = ${fmt(ssTotal)}`,
        `SS_{Interaction} = SS_{Total} - SS_A - SS_B - SS_{Error} = ${fmt(ssInter)}`,
      ].join("\n"),
    },
    {
      id: "ms",
      title: "Step 4: Compute Mean Squares",
      description: [
        `MS_A = SS_A / df_A = ${fmt(ssRow)} / ${dfRow} = ${fmt(msRow)}`,
        `MS_B = SS_B / df_B = ${fmt(ssCol)} / ${dfCol} = ${fmt(msCol)}`,
        `MS_{AB} = SS_{AB} / df_{AB} = ${fmt(ssInter)} / ${dfInter} = ${fmt(msInter)}`,
        `MS_{Error} = SS_{Error} / df_{Error} = ${fmt(ssError)} / ${dfError} = ${fmt(msError)}`,
      ].join("\n"),
    },
    {
      id: "fstats",
      title: "Step 5: Compute F-Statistics",
      description: [
        `F_A = MS_A / MS_{Error} = ${fmt(msRow)} / ${fmt(msError)} = ${fmt(fRow)}`,
        `F_B = MS_B / MS_{Error} = ${fmt(msCol)} / ${fmt(msError)} = ${fmt(fCol)}`,
        `F_{AB} = MS_{AB} / MS_{Error} = ${fmt(msInter)} / ${fmt(msError)} = ${fmt(fInter)}`,
      ].join("\n"),
    },
    {
      id: "decision",
      title: "Step 6: Conclusions (\\alpha = 0.05)",
      description: [
        makeDecision(fRow, value.fCriticalRow, "Factor A (Rows)"),
        makeDecision(fCol, value.fCriticalCol, "Factor B (Columns)"),
        makeDecision(fInter, value.fCriticalInter, "Interaction"),
      ].join("\n"),
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "two-way-anova" };
}
