import type { Request, Response } from "express";
import { randomUUID } from 'crypto';
import { solveRequest, solveResponse } from "../schemas/solve.schema";
import solverService from "../services/solver.service";
import { call_ollama } from "../services/ollama.service";
import { sendErrorResponse } from "../lib/error-response";

export async function solve(req: Request, res: Response) {
    const { question, model } = solveRequest.parse(req.body);
    console.log(`[solve] Model: ${model}, Question: ${question.substring(0, 50)}...`);

    try {
        const result = await solverService.tryMathSolve(question);

        if (result.solved) {
            console.log(`[solve] Math solver succeeded: ${result.answer}`);
            const id = randomUUID();
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