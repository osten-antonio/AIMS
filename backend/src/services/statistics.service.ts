import type { CalculationResult } from "../lib/statistics/types";
import { wrapLatexInSteps } from "./statistics/utils";
import { descriptiveStatsWithSteps } from "./statistics/descriptive";
import { linearRegressionWithSteps } from "./statistics/regression";
import { oneSampleTTestWithSteps, pairedTTestWithSteps, independentTTestStatsWithSteps, independentTTestDataWithSteps } from "./statistics/ttest";
import { goodnessOfFitWithSteps, chiSquareIndependenceWithSteps } from "./statistics/chisquare";
import { oneWayAnovaWithSteps, twoWayAnovaWithSteps } from "./statistics/anova";
import { boxPlotWithSteps, specialMeansWithSteps } from "./statistics/special";
import { binomialRangeWithSteps, binomialNormalApproxWithSteps, poissonRangeWithSteps, poissonNormalApproxWithSteps, hypergeometricWithSteps, combinationsWithSteps, permutationsWithSteps } from "./statistics/probability";

export {
  descriptiveStatsWithSteps,
  linearRegressionWithSteps,
  oneSampleTTestWithSteps,
  pairedTTestWithSteps,
  independentTTestStatsWithSteps,
  independentTTestDataWithSteps,
  goodnessOfFitWithSteps,
  chiSquareIndependenceWithSteps,
  oneWayAnovaWithSteps,
  twoWayAnovaWithSteps,
  boxPlotWithSteps,
  specialMeansWithSteps,
  binomialRangeWithSteps,
  binomialNormalApproxWithSteps,
  poissonRangeWithSteps,
  poissonNormalApproxWithSteps,
  hypergeometricWithSteps,
  combinationsWithSteps,
  permutationsWithSteps,
};

export const handlerMap = {
  "binomial-range": binomialRangeWithSteps,
  "binomial-normal-approx": binomialNormalApproxWithSteps,
  "poisson-range": poissonRangeWithSteps,
  "poisson-normal-approx": poissonNormalApproxWithSteps,
  hypergeometric: hypergeometricWithSteps,
  combinations: combinationsWithSteps,
  permutations: permutationsWithSteps,
  "one-sample-t-test": oneSampleTTestWithSteps,
  "paired-t-test": pairedTTestWithSteps,
  "independent-t-test-data": independentTTestDataWithSteps,
  "independent-t-test-stats": independentTTestStatsWithSteps,
  "goodness-of-fit": goodnessOfFitWithSteps,
  "chi-square-independence": chiSquareIndependenceWithSteps,
  "one-way-anova": oneWayAnovaWithSteps,
  "two-way-anova": twoWayAnovaWithSteps,
  "descriptive-stats": descriptiveStatsWithSteps,
  "linear-regression": linearRegressionWithSteps,
  "box-plot": boxPlotWithSteps,
  "special-means": specialMeansWithSteps,
} as const;

export type StatisticsOperationKey = keyof typeof handlerMap;

export function runOperation(operation: string, input: Record<string, unknown>) {
  let result: CalculationResult;
  switch (operation) {
    case "binomial-range":
      result = binomialRangeWithSteps(input.n as number, input.min as number, input.max as number, input.p as number); break;
    case "binomial-normal-approx":
      result = binomialNormalApproxWithSteps(input.n as number, input.min as number, input.max as number, input.p as number); break;
    case "poisson-range":
      result = poissonRangeWithSteps(input.lambda as number, input.min as number, input.max as number); break;
    case "poisson-normal-approx":
      result = poissonNormalApproxWithSteps(input.lambda as number, input.min as number, input.max as number); break;
    case "hypergeometric":
      result = hypergeometricWithSteps(input.N as number, input.K as number, input.n as number, input.k as number); break;
    case "combinations":
      result = combinationsWithSteps(input.n as number, input.r as number); break;
    case "permutations":
      result = permutationsWithSteps(input.n as number, input.r as number); break;
    case "one-sample-t-test":
      result = oneSampleTTestWithSteps(input.values as number[], input.mu0 as number, input.alpha as number); break;
    case "paired-t-test":
      result = pairedTTestWithSteps(input.before as number[], input.after as number[], input.alpha as number); break;
    case "independent-t-test-data":
      result = independentTTestDataWithSteps(input.sample1 as number[], input.sample2 as number[], input.alpha as number, input.tails as 1 | 2); break;
    case "independent-t-test-stats":
      result = independentTTestStatsWithSteps(input.group1 as { n: number; mean: number; sd: number }, input.group2 as { n: number; mean: number; sd: number }, input.alpha as number, input.tails as 1 | 2); break;
    case "goodness-of-fit":
      result = goodnessOfFitWithSteps(input.observed as number[], input.expected as number[], input.alpha as number); break;
    case "chi-square-independence":
      result = chiSquareIndependenceWithSteps(input.table as number[][], input.alpha as number); break;
    case "one-way-anova":
      result = oneWayAnovaWithSteps(input.groups as number[][]); break;
    case "two-way-anova":
      result = twoWayAnovaWithSteps(input.data as number[][][]); break;
    case "descriptive-stats":
      result = descriptiveStatsWithSteps(input.values as number[]); break;
    case "linear-regression":
      result = linearRegressionWithSteps(input.xValues as number[], input.yValues as number[], input.alpha as number); break;
    case "box-plot":
      result = boxPlotWithSteps(input.values as number[]); break;
    case "special-means":
      result = specialMeansWithSteps(input.values as number[], input.trimPercent as number | undefined, input.trimCount as number | undefined); break;
    default:
      throw new Error(`Operation not implemented: ${operation}`);
  }
  result.steps = wrapLatexInSteps(result.steps);
  return result;
}
