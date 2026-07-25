import type { Request, Response } from "express";
import { randomUUID } from 'crypto';
import { solveRequest, solveResponse } from "../schemas/solve.schema";
import solverService from "../services/solver.service";
import { call_ollama } from "../services/ollama.service";
import { sendErrorResponse } from "../lib/error-response";
import * as cacheService from "../services/cache.service";
import { recordCacheHit, recordCacheMiss } from "../lib/solver-cache-stats";

export async function solve(req: Request, res: Response) {
    const { question, model, model } = solveRequest.parse(req.body);
    console.log(`[solve] Model: ${model}, Question: ${question.substring(0, 50)}...`);

    const startTime = performance.now();

    try {
        // Check Redis cache first (skip if cached answer is "None" - invalid)
        const cached = await cacheService.getAnswerByQuestion(question);
        if (cached && cached.answer?.trim().toLowerCase() !== "none") {
            const elapsed = performance.now() - startTime;
            recordCacheHit(question, elapsed);
            console.log(`[solve] Cache hit (${elapsed.toFixed(1)}ms): ${cached.answer}`);
            return res.json(solveResponse.parse({ answer: cached.answer, id: cached.submissionId ?? randomUUID() }));
        }

        const result = await solverService.tryMathSolve(question);

        if (result.solved) {
            console.log(`[solve] Math solver succeeded: ${result.answer}`);
            const id = randomUUID();
            try {
                await cacheService.setAnswerForQuestionWithSubmissionId(question, result.answer, id);
            } catch (e) {
                console.error('[solve] Failed to cache math answer', e);
            }
            const elapsed = performance.now() - startTime;
            recordCacheMiss(question, elapsed);
            console.log(`[solve] Math solver succeeded (${elapsed.toFixed(1)}ms): ${result.answer}`);
            return res.json(solveResponse.parse({ answer: result.answer, id }));
        }
        console.log(`[solve] Math solver failed, using LLM model: ${model}`);
        
        const prompt = `
			Solve the following math question and 
			return ONLY valid JSON matching the schema {\n  "answer": "<string>",\n  "id": "<string>"\n}
			If it is a math question but unsolvable, respond with exactly "None"
			If it is not a math question, respond with "Not a math question" 
			Question: ${question}
        `;
        const aiResp = await call_ollama(prompt, solveResponse, model);
        if (JSON.stringify(aiResp).includes("Not a math question")) {
            throw Error('Not a math question');
        }
        if (aiResp.answer?.trim().toLowerCase() === "none") {
            return sendErrorResponse(res, 500, "AI could not solve this question");
        }

        const id = randomUUID();
        try {
            await cacheService.setAnswerForQuestionWithSubmissionId(question, aiResp.answer, id);
        } catch (e) {
            console.error('[solve] Failed to cache AI answer', e);
        }

        const elapsed = performance.now() - startTime;
        recordCacheMiss(question, elapsed);
        console.log(`[solve] LLM solved (${elapsed.toFixed(1)}ms): ${aiResp.answer}`);
        aiResp.id = id;
        return res.json(aiResp);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        if (msg === 'Not a math question') {
            return sendErrorResponse(res, 400, msg, 'NOT_A_MATH_QUESTION');
        }
        return sendErrorResponse(res, 500, msg);
    }
}

export async function solveAI(req: Request, res: Response) {
    const { question, model } = solveRequest.parse(req.body);
    try {
               
         const prompt = `
			Solve the following math question and 
			return ONLY valid JSON matching the schema {\n  "answer": "<string>",\n  "id": "<string>"\n}
			If it is a math question but unsolvable, respond with exactly "None"
			If it is not a math question, respond with "Not a math question" 
			Question: ${question}
        `;
        const aiResp = await call_ollama(prompt, solveResponse, model);
        if (JSON.stringify(aiResp).includes("Not a math question")) {
            throw Error('Not a math question');
        }
        if (aiResp.answer?.trim().toLowerCase() === "none") {
            return sendErrorResponse(res, 500, "AI could not solve this question");
        }
        const id = randomUUID();
        aiResp.id = id;
        return res.json(aiResp);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Internal error';
        if (msg === 'Not a math question') {
            return sendErrorResponse(res, 400, msg, 'NOT_A_MATH_QUESTION');
        }
        return sendErrorResponse(res, 500, msg);
    }
}