import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson } from "./utils";

export function oneSampleTTestWithSteps(values: number[], mu0: number, alpha = 0.05): CalculationResult {
  const value = math.oneSampleTTest(values, mu0, alpha);
  const n = values.length;
  const xBar = value.sampleMean;
  const s = value.sampleStdDev;
  const df = value.df;
  const se = s / Math.sqrt(n);
  const t = value.tStatistic;
  const tCritical = value.tCritical;

  const _sum = values.reduce((a, b) => a + b, 0);
  const sumDisplay = n <= 8
    ? values.map(x => fmt(x)).join(" + ")
    : values.slice(0, 5).map(x => fmt(x)).join(" + ") + " + ... + " + fmt(values[n - 1]!);

  const squaredDeviations = values.map(x => Math.pow(x - xBar, 2));
  const sumSquaredDev = squaredDeviations.reduce((a, b) => a + b, 0);

  const _absT = Math.abs(t);
  const reject = value.reject;

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "1. State Null and Alternative Hypotheses",
      description: [
        `Null Hypothesis (H_0): The mean is ${mu0} (\\mu = ${mu0})`,
        `Alternative Hypothesis (H_1): The mean is not ${mu0} (\\mu \\neq ${mu0})`,
      ].join("\n"),
    },
    {
      id: "sample-stats",
      title: "Calculate Sample Statistics",
      formula: "\\bar{x} = \\frac{\\sum x_i}{n}, \\quad s = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n-1}}",
    },
    {
      id: "sample-mean",
      title: "2. Calculate Sample Mean",
      formula: "\\bar{x} = \\frac{\\sum x_i}{n}",
      calculation: `\\text{Sample Mean} = \\frac{${sumDisplay}}{${n}} = ${fmt(xBar)}`,
      result: fmt(xBar),
    },
    {
      id: "sample-sd",
      title: "3. Calculate Sample Standard Deviation",
      formula: "s = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n-1}}",
      description: `Sum of squared deviations: \\Sigma(x_i - ${fmt(xBar)})^2 = ${fmt(sumSquaredDev)}`,
      calculation: `s \\approx ${fmt(s, 2)}`,
      result: fmt(s, 2),
    },
    {
      id: "df",
      title: "Step 2c: Degrees of Freedom",
      formula: "df = n - 1",
      calculation: `df = ${n} - 1 = ${df}`,
      result: String(df),
    },
    {
      id: "t-statistic",
      title: "4. Calculate t-statistic",
      formula: "t = \\frac{\\bar{x} - \\mu_0}{s / \\sqrt{n}}",
      calculation: `t = \\frac{${fmt(xBar)} - ${mu0}}{${fmt(s, 2)}/\\sqrt{${n}}} \\approx \\frac{${fmt(xBar - mu0)}}{${fmt(se, 2)}} \\approx ${fmt(t, 2)}`,
      result: fmt(t, 2),
    },
    {
      id: "critical-value",
      title: "5. Compare t-statistic with Critical Value",
      description: [
        `Degrees of freedom: n - 1 = ${n} - 1 = ${df}.`,
        tCritical !== null
          ? `At \\alpha = ${alpha} (two-tailed), the critical t-value is approximately \\pm${fmt(Math.abs(tCritical), 3)} (from the t-distribution table).`
          : "Critical value not found in table."
      ].join("\n"),
    },
    {
      id: "conclusion",
      title: "6. Conclusion",
      description: tCritical !== null
        ? `Since t = ${fmt(t, 2)} ${reject ? "falls outside" : "falls within"} the range [-${fmt(Math.abs(tCritical), 3)}, ${fmt(Math.abs(tCritical), 3)}], we ${reject ? "reject" : "fail to reject"} the null hypothesis.`
        : "Cannot determine conclusion without critical value.",
      result: reject ? "Reject H_0" : "Fail to reject H_0",
      note: reject
        ? "There is significant evidence to suggest the mean differs."
        : "There is not enough evidence to suggest the mean differs.",
    },
  ];

  return { value: sanitizeForJson(value), steps, inputs: { mu0, alpha } };
}

export function pairedTTestWithSteps(before: number[], after: number[], alpha = 0.05): CalculationResult {
  const value = math.pairedTTest(before, after, alpha);
  const n = before.length;
  const differences = before.map((b, i) => after[i]! - b);
  const dBar = value.meanDiff;
  const sd = value.sdDiff;
  const df = value.df;
  const se = sd / Math.sqrt(n);
  const t = value.tStatistic;
  const tCritical = value.tCritical;

  const sumDiff = differences.reduce((a, b) => a + b, 0);
  const sumDiffDisplay = differences.length <= 8
    ? differences.map(d => fmt(d)).join(" + ")
    : differences.slice(0, 5).map(d => fmt(d)).join(" + ") + " + ... + " + fmt(differences[n - 1]!);

  const squaredDevDiff = differences.map(d => Math.pow(d - dBar, 2));
  const sumSquaredDevDiff = squaredDevDiff.reduce((a, b) => a + b, 0);
  const varianceDiff = sumSquaredDevDiff / (n - 1);

  const absT = Math.abs(t);
  const reject = value.reject;

  const steps: CalculationStep[] = [
    {
      id: "identify",
      title: "Identify the Hypothesis Test",
      description: [
        `H_0: \\mu_d = 0 (no difference)`,
        `H_1: \\mu_d \\neq 0 (there is a difference)`,
        `\\alpha = ${alpha} (significance level)`,
        `n = ${n} (number of pairs)`,
      ].join("\n"),
    },
    {
      id: "differences",
      title: "Calculate Differences (After - Before)",
      description: `d = [${differences.slice(0, 8).map(d => fmt(d)).join(", ")}${differences.length > 8 ? ", ..." : ""}]`,
    },
    {
      id: "diff-stats",
      title: "Calculate Difference Statistics",
      formula: "\\bar{d} = \\frac{\\sum d_i}{n}, \\quad s_d = \\sqrt{\\frac{\\sum(d_i - \\bar{d})^2}{n-1}}",
    },
    {
      id: "diff-mean",
      title: "Step 3a: Calculate Mean of Differences",
      formula: "\\bar{d} = \\frac{\\sum d_i}{n}",
      calculation: `\\bar{d} = \\frac{${sumDiffDisplay}}{${n}} = \\frac{${fmt(sumDiff)}}{${n}} = ${fmt(dBar)}`,
      result: fmt(dBar),
    },
    {
      id: "diff-sd",
      title: "Step 3b: Calculate Standard Deviation of Differences",
      formula: "s_d = \\sqrt{\\frac{\\sum(d_i - \\bar{d})^2}{n-1}}",
      description: `Sum of squared deviations: \\Sigma(d_i - ${fmt(dBar)})^2 = ${fmt(sumSquaredDevDiff)}`,
      calculation: `s_d = \\sqrt{\\frac{${fmt(sumSquaredDevDiff)}}{${n - 1}}} = \\sqrt{${fmt(varianceDiff)}} = ${fmt(sd)}`,
      result: fmt(sd),
    },
    {
      id: "df",
      title: "Step 3c: Degrees of Freedom",
      formula: "df = n - 1",
      calculation: `df = ${n} - 1 = ${df}`,
      result: String(df),
    },
    {
      id: "formula",
      title: "State the Paired t-Test Formula",
      formula: "t = \\frac{\\bar{d}}{s_d / \\sqrt{n}}",
    },
    {
      id: "standard-error",
      title: "Calculate Standard Error",
      calculation: `SE = \\frac{${fmt(sd)}}{\\sqrt{${n}}} = ${fmt(se)}`,
      result: fmt(se),
    },
    {
      id: "t-statistic",
      title: "Calculate t-Statistic",
      calculation: `t = \\frac{${fmt(dBar)}}{${fmt(se)}} = ${fmt(t)}`,
      result: fmt(t),
    },
    {
      id: "critical-value",
      title: "Find Critical Value",
      description: `For \\alpha = ${alpha} (two-tailed), df = ${df}`,
      result: tCritical !== null ? `t-critical = \\pm${fmt(tCritical)}` : "Not in table",
    },
    {
      id: "decision",
      title: "Make Decision",
      description: tCritical !== null
        ? `|t| = ${fmt(absT)} ${reject ? ">" : "\\le"} ${fmt(tCritical)}`
        : "Cannot determine",
      result: reject ? "Reject H_0" : "Fail to reject H_0",
      note: reject
        ? `There is a statistically significant difference between before and after at \\alpha = ${alpha}.`
        : `There is no statistically significant difference between before and after at \\alpha = ${alpha}.`,
    },
  ];

  return { value: sanitizeForJson(value), steps, formula: "paired-t-test", inputs: { alpha } };
}

export function independentTTestStatsWithSteps(
  group1: { n: number; mean: number; sd: number },
  group2: { n: number; mean: number; sd: number },
  alpha = 0.05,
  tails: 1 | 2 = 2,
): CalculationResult {
  const value = math.independentTTestFromStats(group1, group2, alpha, tails);
  const { n: n1, mean: x1Bar, sd: s1 } = group1;
  const { n: n2, mean: x2Bar, sd: s2 } = group2;
  const var1 = s1 * s1;
  const var2 = s2 * s2;
  const useWelch = value.method === "welch";

  const [largerVar, smallerVar] =
    var1 >= var2 ? [var1, var2, n1 - 1, n2 - 1] : [var2, var1, n2 - 1, n1 - 1];
  const _fStat = largerVar / smallerVar;

  let se = 0;
  let pooledVar = 0;
  if (!useWelch) {
    pooledVar = value.pooledVariance;
    if (n1 === n2) {
      se = Math.sqrt(var1 / n1 + var2 / n2);
    } else {
      se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
    }
  } else {
    se = Math.sqrt(var1 / n1 + var2 / n2);
  }

  const t = value.tStatistic;
  const df = value.df;
  const tCritical = value.tCritical;
  const _absT = Math.abs(t);
  const reject = value.reject;
  const h1Desc = tails === 2
    ? `• Alternative Hypothesis (H_1): The means of the two groups are different (\\mu_1 \\neq \\mu_2)`
    : `• Alternative Hypothesis (H_1): The means of the two groups are different (directional)`;

  const steps: CalculationStep[] = [
    {
      id: "hypotheses",
      title: "1. State Hypotheses",
      description: [
        `• Null Hypothesis (H_0): The means for both groups are equal (\\mu_1 = \\mu_2)`,
        h1Desc,
      ].join("\n"),
    },
  ];

  if (useWelch) {
    steps.push(
      {
        id: "t-formula",
        title: "Calculate the t-statistic:",
        formula: "t = \\frac{\\bar{x}_1 - \\bar{x}_2}{\\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}}",
        description: "Using Welch's t-test (Unequal Variances assumed via F-test)",
      },
      {
        id: "substitute",
        title: "Substitute the values:",
        formula: `t = \\frac{${fmt(x1Bar)} - ${fmt(x2Bar)}}{\\sqrt{\\frac{${fmt(s1)}^2}{${n1}} + \\frac{${fmt(s2)}^2}{${n2}}}}`,
      },
      {
        id: "intermediate-terms",
        title: "First, calculate the variances divided by sample sizes:",
        calculation: `\\frac{${fmt(s1)}^2}{${n1}} = ${fmt(var1 / n1)}, \\quad \\frac{${fmt(s2)}^2}{${n2}} = ${fmt(var2 / n2)}`,
      },
      {
        id: "sqrt-step",
        title: "Combine and square root:",
        calculation: `\\sqrt{${fmt(var1 / n1)} + ${fmt(var2 / n2)}} = \\sqrt{${fmt(var1 / n1 + var2 / n2)}} \\approx ${fmt(se)}`,
      },
    );
  } else if (n1 === n2) {
    steps.push(
      {
        id: "t-formula",
        title: "Calculate the t-statistic:",
        formula: "t = \\frac{\\bar{x}_1 - \\bar{x}_2}{\\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}}}",
        description: "Equal Sample Sizes allows simplified formula",
      },
      {
        id: "substitute",
        title: "Substitute the values:",
        formula: `t = \\frac{${fmt(x1Bar)} - ${fmt(x2Bar)}}{\\sqrt{\\frac{${fmt(s1)}^2}{${n1}} + \\frac{${fmt(s2)}^2}{${n2}}}}`,
      },
      {
        id: "intermediate-terms",
        title: "First, calculate the variances divided by sample sizes:",
        calculation: `\\frac{${fmt(s1)}^2}{${n1}} = ${fmt(var1 / n1)}, \\quad \\frac{${fmt(s2)}^2}{${n2}} = ${fmt(var2 / n2)}`,
      },
      {
        id: "sqrt-step",
        title: "Combine and square root:",
        calculation: `\\sqrt{${fmt(var1 / n1)} + ${fmt(var2 / n2)}} = \\sqrt{${fmt(var1 / n1 + var2 / n2)}} \\approx ${fmt(se)}`,
      },
    );
  } else {
    steps.push(
      {
        id: "t-formula",
        title: "Calculate the t-statistic:",
        formula: "t = \\frac{\\bar{x}_1 - \\bar{x}_2}{\\sqrt{s_p^2(\\frac{1}{n_1} + \\frac{1}{n_2})}}",
        description: "Using Pooled Variance (Equal Variances assumed via F-test)",
      },
      {
        id: "pooled-var-calc",
        title: "Calculate Pooled Variance:",
        calculation: `s_p^2 = \\frac{(${n1}-1)${fmt(s1)}^2 + (${n2}-1)${fmt(s2)}^2}{${n1}+${n2}-2} = ${fmt(pooledVar)}`,
      },
      {
        id: "substitute",
        title: "Substitute the values into SE formula:",
        formula: `t = \\frac{${fmt(x1Bar)} - ${fmt(x2Bar)}}{\\sqrt{${fmt(pooledVar)}(\\frac{1}{${n1}} + \\frac{1}{${n2}})}}`,
      },
      {
        id: "se-calc",
        title: "Calculate Standard Error:",
        calculation: `SE = \\sqrt{${fmt(pooledVar)} \\cdot ${fmt(1 / n1 + 1 / n2)}} = ${fmt(se)}`,
      },
    );
  }

  steps.push(
    {
      id: "final-t",
      title: "Now calculate t:",
      calculation: `t = \\frac{${fmt(x1Bar - x2Bar)}}{${fmt(se)}} \\approx ${fmt(t)}`,
      result: fmt(t),
    },
    {
      id: "df-crit",
      title: "Degrees of Freedom and Critical t-value",
      description: [
        `Degrees of freedom: df = ${useWelch ? "(Satterthwaite)" : (n1 === n2 ? "nA + nB - 2" : "n1 + n2 - 2")} = ${fmt(df, 2)}`,
        `At \\alpha = ${alpha} (${tails === 1 ? "one-tailed" : "two-tailed"}), the critical t-value for df = ${fmt(df, 2)} is approximately ${tCritical !== null ? `\\pm${fmt(tCritical)}` : "N/A"}`,
      ].join("\n"),
    },
    {
      id: "decision",
      title: "Conclusion",
      description: tCritical !== null
        ? `Compare the t-statistic to the critical value: |${fmt(t)}| ${reject ? ">" : "\\le"} ${fmt(tCritical)}`
        : "Cannot determine critical value",
      result: reject ? "Reject the null hypothesis." : "Fail to reject the null hypothesis.",
      note: reject
        ? "Since the calculated t-value exceeds the critical t-value, we reject the null hypothesis."
        : "Since the calculated t-value does not exceed the critical t-value, we fail to reject the null hypothesis.",
    },
  );

  return { value: sanitizeForJson(value), steps, inputs: { alpha, tails } };
}

export function independentTTestDataWithSteps(
  sample1: number[],
  sample2: number[],
  alpha = 0.05,
  tails: 1 | 2 = 2,
): CalculationResult {
  const n1 = sample1.length;
  const n2 = sample2.length;

  const sum1 = sample1.reduce((a, b) => a + b, 0);
  const sum2 = sample2.reduce((a, b) => a + b, 0);
  const x1Bar = sum1 / n1;
  const x2Bar = sum2 / n2;

  const sumDisplay1 = n1 <= 6
    ? sample1.map(x => fmt(x)).join(" + ")
    : sample1.slice(0, 4).map(x => fmt(x)).join(" + ") + " + ...";
  const sumDisplay2 = n2 <= 6
    ? sample2.map(x => fmt(x)).join(" + ")
    : sample2.slice(0, 4).map(x => fmt(x)).join(" + ") + " + ...";

  const squaredDev1 = sample1.map(x => Math.pow(x - x1Bar, 2));
  const squaredDev2 = sample2.map(x => Math.pow(x - x2Bar, 2));
  const sumSqDev1 = squaredDev1.reduce((a, b) => a + b, 0);
  const sumSqDev2 = squaredDev2.reduce((a, b) => a + b, 0);
  const var1 = sumSqDev1 / (n1 - 1);
  const var2 = sumSqDev2 / (n2 - 1);
  const s1 = Math.sqrt(var1);
  const s2 = Math.sqrt(var2);

  const dataCalcSteps: CalculationStep[] = [
    {
      id: "sample-stats",
      title: "Calculate Sample Statistics",
      formula: "\\bar{x} = \\frac{\\sum x_i}{n}, \\quad s = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n-1}}",
    },
    {
      id: "group1-mean",
      title: "Step 1a: Group 1 - Sample Mean",
      formula: "\\bar{x}_1 = \\frac{\\sum x_{1i}}{n_1}",
      calculation: `\\bar{x}_1 = \\frac{${sumDisplay1}}{${n1}} = \\frac{${fmt(sum1)}}{${n1}} = ${fmt(x1Bar)}`,
      result: fmt(x1Bar),
    },
    {
      id: "group1-sd",
      title: "Step 1b: Group 1 - Sample Standard Deviation",
      formula: "s_1 = \\sqrt{\\frac{\\sum(x_{1i} - \\bar{x}_1)^2}{n_1-1}}",
      calculation: `s_1 = \\sqrt{\\frac{${fmt(sumSqDev1)}}{${n1 - 1}}} = \\sqrt{${fmt(var1)}} = ${fmt(s1)}`,
      result: fmt(s1),
    },
    {
      id: "group2-mean",
      title: "Step 1c: Group 2 - Sample Mean",
      formula: "\\bar{x}_2 = \\frac{\\sum x_{2i}}{n_2}",
      calculation: `\\bar{x}_2 = \\frac{${sumDisplay2}}{${n2}} = \\frac{${fmt(sum2)}}{${n2}} = ${fmt(x2Bar)}`,
      result: fmt(x2Bar),
    },
    {
      id: "group2-sd",
      title: "Step 1d: Group 2 - Sample Standard Deviation",
      formula: "s_2 = \\sqrt{\\frac{\\sum(x_{2i} - \\bar{x}_2)^2}{n_2-1}}",
      calculation: `s_2 = \\sqrt{\\frac{${fmt(sumSqDev2)}}{${n2 - 1}}} = \\sqrt{${fmt(var2)}} = ${fmt(s2)}`,
      result: fmt(s2),
    },
  ];

  const statsResult = independentTTestStatsWithSteps(
    { n: n1, mean: x1Bar, sd: s1 },
    { n: n2, mean: x2Bar, sd: s2 },
    alpha,
    tails,
  );

  const coreSteps = statsResult.steps.filter(s => s.id !== "hypotheses" && s.id !== "error").map(step => {
    const newTitle = step.title.replace(/^(\d+)\./, (match, p1) => {
      const newNum = parseInt(p1) + 1;
      return `${newNum}.`;
    });
    return { ...step, title: newTitle };
  });

  const identifyStep = statsResult.steps.find(s => s.id === "hypotheses");

  return {
    value: statsResult.value,
    steps: [
      ...(identifyStep ? [identifyStep] : []),
      ...dataCalcSteps,
      ...coreSteps,
    ],
    formula: statsResult.formula ?? "",
    inputs: { alpha, tails },
  };
}
