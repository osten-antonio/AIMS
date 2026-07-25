import * as z from "zod";

// category will be handled in route, assume general
export const solveRequest = z.object({
    question: z.string(),
    model: z.string().optional(),
});

export const solveResponse = z.object({
    answer: z.string(),
    id: z.string() // handled in hashing later
});