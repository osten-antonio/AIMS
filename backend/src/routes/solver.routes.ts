import express from "express";

import { globalRateLimit, ollamaRateLimit } from "../middleware/rateLimit.middleware";
import { solve, solveAI } from "../controllers/solver.controller";
import * as statsService from "../services/statistics.service";
import { sendErrorResponse } from "../lib/error-response";
import { statisticsOperations } from "../controllers/statistics.controller";

/**
 * @openapi
 * tags:
 *   - name: Solver
 *     description: Solve math problems via deterministic or AI-based pipelines.
 */

const solverRouter = express.Router();

/**
 * @openapi
 * /solver/solve:
 *   post:
 *     tags: [Solver]
 *     summary: Solve a math problem with deterministic engine
 *     description: Solves a math problem with math.js, will fallback to AI if necessary.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/solveRequest'
 *           example:
 *             question: "Solve for x: 2x + 3 = 11"
 *             model: "qwen2.5:7b"
 *     responses:
 *       '200':
 *         description: Solved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/solveResponse'
 *             example:
 *               answer: "x = 4"
 *               id: "550e8400-e29b-41d4-a716-446655440000"
 *       '400':
 *         description: Validation error or not a math question
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Not a math question"
 *               code: "NOT_A_MATH_QUESTION"
 */
solverRouter.post('/solve', globalRateLimit, solve);

/**
 * @openapi
 * /solver/solve/ai:
 *   post:
 *     tags: [Solver]
 *     summary: Solve a math problem using AI fallback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/solveRequest'
 *           example:
 *             question: "Solve: integral of x^2 dx"
 *             model: "qwen2.5:7b"
 *     responses:
 *       '200':
 *         description: Solved using AI
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/solveResponse'
 *             example:
 *               answer: "x^3/3 + C"
 *               id: "ai-550e8400-e29b-41d4-a716-446655440000"
 *       '400':
 *         description: Validation error or not a math question
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Not a math question"
 *               code: "NOT_A_MATH_QUESTION"
 */
solverRouter.post('/solve/ai', ollamaRateLimit, solveAI);

// Known statistics operations. Membership is checked before dispatching the
// user-controlled `:operation` param so it can't resolve to an inherited
// prototype method (e.g. "constructor", "toString").
const validStatisticsOperations = new Set(Object.keys(statisticsOperations));

/**
 * @openapi
 * /solver/statistics/{operation}:
 *   post:
 *     tags: [Solver]
 *     summary: Run a statistics calculation
 *     description: Dispatches to the server-side statistics engine. Supports all operations listed in the Statistics tag.
 *     parameters:
 *       - in: path
 *         name: operation
 *         required: true
 *         schema:
 *           type: string
 *         description: The calculation to run (e.g. binomial-range, descriptive-stats, one-way-anova).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           example:
 *             n: 10
 *             min: 4
 *             max: 6
 *             p: 0.5
 *     responses:
 *       '200':
 *         description: Calculation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/statisticsResponse'
 *       '400':
 *         description: Validation or calculation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Statistics under solver namespace: POST /solver/statistics/:operation
solverRouter.post('/statistics/:operation', globalRateLimit, (req, res) => {
	// Normalize operation param to a single string for type-safety
	const rawOp = req.params.operation;
	const operation = Array.isArray(rawOp) ? rawOp[0] : rawOp ?? "";
	if (!operation) return sendErrorResponse(res, 400, "Missing operation parameter", "VALIDATION_ERROR");

	try {
		// Try the new service dispatcher first
		const result = statsService.runOperation(operation, req.body);
		return res.json({ result });
	} catch (err) {
		// If not implemented in service, fall back to the legacy statistics controller
		// handlers — but only for a validated operation name, so the lookup can't reach
		// an inherited prototype method.
		if (validStatisticsOperations.has(operation)) {
			const opHandler = statisticsOperations[operation as keyof typeof statisticsOperations];
			if (typeof opHandler === "function") {
				return opHandler(req, res);
			}
		}
		const message = err instanceof Error ? err.message : "Calculation error";
		return sendErrorResponse(res, 400, message, "CALCULATION_ERROR");
	}
});


export default solverRouter;
