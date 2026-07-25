import type { Request, Response } from "express";
import { ZodError } from "zod";
import { generateSteps, generateHints, generateStepExplanation, generateFollowUp } from "../services/explanation.service";
import { stepsRequest, explanationRequest, followUpRequest } from "../schemas/explanation.schema";
import { sendErrorResponse } from "../lib/error-response";

export async function steps(req: Request, res: Response) {
    try {
        console.log('[steps] Request body:', JSON.stringify(req.body));
        const validatedData = stepsRequest.parse(req.body);
        console.log('[steps] Validated data:', JSON.stringify(validatedData));
        const result = await generateSteps(validatedData);
        return res.status(200).json(result);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            return sendErrorResponse(res, 400, "Invalid request parameters", 'INVALID_REQUEST', { errors: error.issues });
        }
        console.error("Error in steps controller:", error);
        return sendErrorResponse(res, 500, error instanceof Error ? error.message : 'Internal error');
    }
}

export async function hint(req: Request, res: Response) {
    try {
        console.log(req.body);
        const validatedData = stepsRequest.parse(req.body);
        const result = await generateHints(validatedData);
        return res.status(200).json(result);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            return sendErrorResponse(res, 400, "Invalid request parameters", 'INVALID_REQUEST', { errors: error.issues });
        }
        console.error("Error in hint controller:", error instanceof Error ? error.message : error);
        return sendErrorResponse(res, 500, error instanceof Error ? error.message : 'Internal error');
    }
}

export async function generate(req: Request, res: Response) {
    try {
        console.log(req.body);
        const validatedData = explanationRequest.parse(req.body);
        const result = await generateStepExplanation(validatedData);
        return res.status(200).json(result);
    } catch (error: unknown) {
        console.log(error);
        if (error instanceof ZodError) {
            return sendErrorResponse(res, 400, "Invalid request parameters", 'INVALID_REQUEST', { errors: error.issues });
        }
        console.error("Error in generate controller:", error instanceof Error ? error.message : error);
        return sendErrorResponse(res, 500, "An unexpected error occurred.");
    }
}

export async function followUpExplanation(req: Request, res: Response) {
    try {
        const validatedData = followUpRequest.parse(req.body);
        const result = await generateFollowUp(validatedData);
        return res.status(200).json(result);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            return sendErrorResponse(res, 400, "Invalid request parameters", 'INVALID_REQUEST', { errors: error.issues });
        }
        console.error("Error in follow-up controller:", error instanceof Error ? error.message : error);
        return sendErrorResponse(res, 500, "An unexpected error occurred.");
    }
}