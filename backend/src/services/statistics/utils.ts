import type { CalculationStep } from "../../lib/statistics/types";

export function fmt(n: number, digits = 4) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(digits)).toString();
}

export function sanitizeForJson(v: unknown): unknown {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (Array.isArray(v)) return v.map(sanitizeForJson);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = sanitizeForJson(val);
    }
    return out;
  }
  return v;
}

export function dataPreview(data: number[], max = 8): string {
  if (data.length <= max) return data.join(", ");
  return data.slice(0, max).join(", ") + ", ...";
}

export function sortedPreview(data: number[], max = 10): string {
  const sorted = [...data].sort((a, b) => a - b);
  if (sorted.length <= max) return sorted.join(", ");
  return sorted.slice(0, max).join(", ") + ", ...";
}

export function wrapLatex(text: string): string {
  return text.split("\n").map(wrapLatexLine).join("\n");
}

export function wrapLatexLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  if (!/\\[a-zA-Z]|[_^]/.test(trimmed)) return line;

  let out = "";
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] === "\\" && i + 1 < trimmed.length && /[a-zA-Z]/.test(trimmed[i + 1]!)) {
      let j = i + 1;
      while (j < trimmed.length && /[a-zA-Z]/.test(trimmed[j]!)) j++;
      while (j < trimmed.length && trimmed[j] === "{") {
        let depth = 0;
        do {
          if (trimmed[j] === "{") depth++;
          else if (trimmed[j] === "}") depth--;
          j++;
        } while (j < trimmed.length && depth > 0);
      }
      while (j < trimmed.length && (trimmed[j] === "_" || trimmed[j] === "^")) {
        j++;
        if (j < trimmed.length && trimmed[j] === "{") {
          let depth = 0;
          do {
            if (trimmed[j] === "{") depth++;
            else if (trimmed[j] === "}") depth--;
            j++;
          } while (j < trimmed.length && depth > 0);
        } else if (j < trimmed.length && /[a-zA-Z0-9]/.test(trimmed[j]!)) {
          j++;
        }
      }
      out += `$${trimmed.slice(i, j)}$`;
      i = j;
      continue;
    }

    if (/[a-zA-Z0-9]/.test(trimmed[i]!)) {
      let j = i;
      while (j < trimmed.length && /[a-zA-Z0-9]/.test(trimmed[j]!)) j++;
      if (j < trimmed.length && (trimmed[j] === "_" || trimmed[j] === "^")) {
        const subPos = j;
        j++;
        if (j < trimmed.length && trimmed[j] === "{") {
          let depth = 0;
          do {
            if (trimmed[j] === "{") depth++;
            else if (trimmed[j] === "}") depth--;
            j++;
          } while (j < trimmed.length && depth > 0);
          out += `$${trimmed.slice(i, j)}$`;
          i = j;
          continue;
        } else if (j < trimmed.length && /[a-zA-Z0-9]/.test(trimmed[j]!)) {
          j++;
          out += `$${trimmed.slice(i, j)}$`;
          i = j;
          continue;
        } else {
          out += trimmed.slice(i, subPos);
          i = subPos;
          continue;
        }
      }
      out += trimmed.slice(i, j);
      i = j;
      continue;
    }

    out += trimmed[i];
    i++;
  }

  return out;
}

export function wrapLatexInSteps(steps: CalculationStep[]): CalculationStep[] {
  return steps.map((s) => {
    const out = { ...s };
    if (out.description) out.description = wrapLatex(out.description);
    if (out.calculation) out.calculation = wrapLatex(out.calculation);
    if (out.result) out.result = wrapLatex(out.result);
    if (out.note) out.note = wrapLatex(out.note);
    return out;
  });
}
