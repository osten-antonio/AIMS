import { evaluate, derivative, matrix, det, inv, simplify, parse } from 'mathjs';
import { normalizeQuestion } from '../lib/utils';

export type MathSolveResult = {
    answer: string;
    solved: boolean;
};

function cleanLatex(latex: string): string {
    let s = latex;

    s = s.replace(/\\div/g, '/');
    s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '($1)/($2)');
    s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');
    s = s.replace(/\\left\(|\\right\)/g, '');
    s = s.replace(/\\left\{|\\right\}/g, '');
    s = s.replace(/\\cdot|\\times/g, '*');

    s = s.replace(/\\text\{(.+?)\}/g, '');
    s = s.replace(/\\mathrm\{(.+?)\}/g, '$1');

    // Remaining brace groups (this also catches bare "^{2}" exponents, which
    // have no backslash and previously skipped this conversion entirely).
    s = s.replace(/\{(.+?)\}/g, '($1)');
    s = s.replace(/\\/g, '');

    return s;
}

function extractBracketedMatrix(text: string): string | null {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end <= start) return null;
    return text.slice(start, end + 1);
}

export async function tryMathSolve(question: string): Promise<MathSolveResult> {
    const q = cleanLatex(normalizeQuestion(question));

    // Derivative
    if (/\b(derive|derivative|differentiate|d\/dx)\b/i.test(q)) {
        try {
            // Extracts the keyword
            const m = q.match(/(?:derive|derivative|differentiate|d\/dx)(?:\s+of)?\s+(.*)/i);

            // Clean expr
            let expr = (m && m[1]) ? m[1] : q;
            expr = expr.replace(/\b(derivative|differentiate|d\/dx|of)\b/gi, '').trim();

            // Check for vairable, defaults to x
            let variable = 'x';
            if (/\bx\b/i.test(expr)) {
                variable = 'x';
            } else {
                const varMatch = expr.match(/[a-zA-Z]/);
                if (varMatch) variable = varMatch[0];
            }

            const resultNode = derivative(expr, variable);
            const simplified = simplify(resultNode);

            return { answer: `Derivative: ${simplified.toString()}`, solved: true };
        } catch {
            return { answer: '', solved: false };
        }
    }

    // Matrices
    const matrixLiteral = extractBracketedMatrix(q);
    if (matrixLiteral && /determinant|det|inverse|inv/i.test(q)) {
        try {
            const mat = matrix(JSON.parse(matrixLiteral));

            if (/determinant|det/i.test(q)) {
                const dval = det(mat);
                return { answer: `determinant = ${dval}`, solved: true };
            }

            if (/inverse|inv/i.test(q)) {
                const invmat = inv(mat);
                return { answer: `inverse = ${JSON.stringify(invmat.toArray ? invmat.toArray() : invmat)}`, solved: true };
            }
        } catch {
            return { answer: '', solved: false };
        }
    }

    if (!/=/.test(q)) {
        try {
            // Strip command verbs
            const expr = q.replace(/\b(evaluate|calculate|compute|simplify|what is|solve)\b/gi, '').trim();

            // Handles non variable expression, 2+2, etc
            const val = evaluate(expr);

            if (val !== undefined && val !== null) {
                // Handle matrix results from evaluation
                if (val.toArray) {
                    return { answer: JSON.stringify(val.toArray()), solved: true };
                }
                return { answer: String(val), solved: true };
            }
        } catch {
            // expression evaluation failed; fall through to equation solver
        }
    }


    if (/=/.test(q)) {
        try {
            const parts = q.split('=');
            if (parts.length === 2) {
                const left = parts[0] || '';
                const right = parts[1] || '';

                const vMatch = q.match(/([a-zA-Z])/);
                if (vMatch && vMatch[1]) {
                    const variable = vMatch[1];

                    try {
                        const node = parse(`(${left}) - (${right})`);
                        const f = node.compile();

                        const c = f.evaluate({ [variable]: 0 });   // C
                        const f1 = f.evaluate({ [variable]: 1 });  // A + B + C
                        const fm1 = f.evaluate({ [variable]: -1 }); // A - B + C

                        if (typeof c === 'number' && typeof f1 === 'number' && typeof fm1 === 'number') {
                            const A = ((f1 + fm1) / 2) - c;
                            const B = (f1 - fm1) / 2;
                            const C = c;

                            if (Math.abs(A) >= 1e-12) {
                                // Genuinely quadratic
                                const discriminant = B * B - 4 * A * C;

                                if (discriminant < 0) {
                                    // Complex roots
                                    const realPart = -B / (2 * A);
                                    const imagPart = Math.sqrt(-discriminant) / (2 * A);
                                    const sign = imagPart < 0 ? '-' : '+';
                                    return { answer: `${variable} = ${realPart.toFixed(3)} ${sign} ${Math.abs(imagPart).toFixed(3)}i`, solved: true };
                                } else {
                                    // Real roots
                                    const x1 = (-B + Math.sqrt(discriminant)) / (2 * A);
                                    const x2 = (-B - Math.sqrt(discriminant)) / (2 * A);

                                    if (Math.abs(x1 - x2) < 1e-9) {
                                        return { answer: `${variable} = ${x1}`, solved: true }; // Repeated root
                                    }
                                    return { answer: `${variable} = ${x1}, ${x2}`, solved: true };
                                }
                            } else {
                                // Linear: B*x + C = 0  ->  x = -C/B
                                if (Math.abs(B) < 1e-12) {
                                    return { answer: '', solved: false };
                                }
                                const solution = -C / B;
                                return { answer: `${variable} = ${solution}`, solved: true };
                            }
                        }
                    } catch (e) {
                        console.error("Equation solver failed", e);
                    }
                }
            }
        } catch {
            return { answer: '', solved: false };
        }
    }

    return { answer: '', solved: false };
}

export default { tryMathSolve };