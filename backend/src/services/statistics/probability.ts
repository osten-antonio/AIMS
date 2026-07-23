import * as math from "../../lib/statistics/math";
import type { CalculationResult, CalculationStep } from "../../lib/statistics/types";
import { fmt, sanitizeForJson } from "./utils";

export function binomialRangeWithSteps(n: number, min: number, max: number, p: number): CalculationResult {
  const prob = math.binomialRangeProbability(n, min, max, p);

  const perK: string[] = [];
  for (let k = min; k <= max; k += 1) {
    const c = math.combinations(n, k);
    const pPow = Math.pow(p, k);
    const qPow = Math.pow(1 - p, n - k);
    const pmf = math.binomialPmf(n, k, p);
    perK.push(
      `P(X=${k}) = C(${n},${k})=${c} \\cdot ${p}^{${k}}=${fmt(pPow, 8)} \\cdot ${(1 - p)}^{${n - k}}=${fmt(qPow, 8)} \\Rightarrow ${fmt(pmf, 8)}`,
    );
  }

  const calculationsPreview = perK.length > 6 ? `${perK.slice(0, 3).join("; ")} ; ... ; ${perK.slice(-2).join("; ")}` : perK.join("; ");

  const steps: CalculationStep[] = [
    { id: "identify", title: "Identify parameters", description: `n=${n}, p=${p}, range=[${min},${max}]` },
    { id: "formula", title: "Binomial formula", formula: "P(X = k) = C(n, k) \\cdot p^k \\cdot (1-p)^{n-k}" },
    { id: "calculations", title: "Calculate individual probabilities (P(X=k))", calculation: calculationsPreview },
    { id: "sum", title: "Sum the Results", calculation: `\\Sigma P(X=k) \\text{ for } k=${min}..${max} = ${perK.length <= 6 ? perK.map((s) => s.split('\\Rightarrow').pop()?.trim()).join(' + ') : 'See calculations preview'} = ${fmt(prob, 8)}` },
    { id: "result", title: "Final Answer", result: String(fmt(prob, 8)) },
  ];
  return { value: sanitizeForJson(prob), steps, formula: "binomial-range", inputs: { n, min, max, p } };
}

export function binomialNormalApproxWithSteps(n: number, min: number, max: number, p: number): CalculationResult {
  const value = math.binomialNormalApproxProbability(n, min, max, p);
  const steps: CalculationStep[] = [
    { id: "identify", title: "Identify parameters", description: `n=${n}, p=${p}` },
    { id: "approx", title: "Normal approximation", formula: `\\text{mean}=${fmt(value.mean, 6)}, \\text{sd}=${fmt(value.stdDev, 6)}` },
    { id: "z", title: "Z values", calculation: `z_{low}=${fmt(value.zLow, 6)}, z_{high}=${fmt(value.zHigh, 6)}` },
    { id: "result", title: "Probability", result: String(fmt(value.probability, 8)) },
  ];
  return { value: sanitizeForJson(value), steps, formula: "binomial-normal-approx", inputs: { n, min, max, p } };
}

export function poissonRangeWithSteps(lambda: number, min: number, max: number): CalculationResult {
  const prob = math.poissonRangeProbability(lambda, min, max);
  const pmfs: string[] = [];
  for (let k = min; k <= max; k += 1) {
    const pmf = math.poissonPmf(lambda, k);
    pmfs.push(`${k}: ${fmt(pmf, 8)}`);
  }
  const steps: CalculationStep[] = [
    { id: "identify", title: "Identify parameters", description: `\\lambda=${lambda}, range=[${min},${max}]` },
    { id: "pmf", title: "PMF values", calculation: pmfs.join(", ") },
    { id: "result", title: "Range probability", result: String(fmt(prob, 8)) },
  ];
  return { value: sanitizeForJson(prob), steps, formula: "poisson-range", inputs: { lambda, min, max } };
}

export function poissonNormalApproxWithSteps(lambda: number, min: number, max: number): CalculationResult {
  const value = math.poissonNormalApproxProbability(lambda, min, max);
  const steps: CalculationStep[] = [
    { id: "identify", title: "Identify parameters", description: `\\lambda=${lambda}` },
    { id: "approx", title: "Normal approximation", calculation: `\\text{mean}=${fmt(value.mean, 6)}, \\text{sd}=${fmt(value.stdDev, 6)}` },
    { id: "z", title: "Z values", calculation: `z_{low}=${fmt(value.zLow, 6)}, z_{high}=${fmt(value.zHigh, 6)}` },
    { id: "result", title: "Probability", result: String(fmt(value.probability, 8)) },
  ];
  return { value: sanitizeForJson(value), steps, formula: "poisson-normal-approx", inputs: { lambda, min, max } };
}

export function hypergeometricWithSteps(N: number, K: number, n: number, k: number): CalculationResult {
  const value = math.hypergeometricProbability(N, K, n, k);
  const steps: CalculationStep[] = [
    { id: "identify", title: "Identify parameters", description: `N=${N}, K=${K}, n=${n}, k=${k}` },
    { id: "result", title: "Probability", result: String(fmt(value, 8)) },
  ];
  return { value: sanitizeForJson(value), steps, formula: "hypergeometric", inputs: { N, K, n, k } };
}

export function combinationsWithSteps(n: number, r: number): CalculationResult {
  const value = math.combinations(n, r);
  const steps: CalculationStep[] = [
    { id: "formula", title: "Combinations formula", formula: "C(n,r) = \\frac{n!}{r!(n-r)!}" },
    { id: "result", title: "Result", result: String(value) },
  ];
  return { value: sanitizeForJson(value), steps, formula: "combinations", inputs: { n, r } };
}

export function permutationsWithSteps(n: number, r: number): CalculationResult {
  const value = math.permutations(n, r);
  const steps: CalculationStep[] = [
    { id: "formula", title: "Permutations formula", formula: "P(n,r) = \\frac{n!}{(n-r)!}" },
    { id: "result", title: "Result", result: String(value) },
  ];
  return { value: sanitizeForJson(value), steps, formula: "permutations", inputs: { n, r } };
}
