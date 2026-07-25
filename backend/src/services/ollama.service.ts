import { Ollama } from 'ollama';
import { type ZodObject, type ZodRawShape, type z, toJSONSchema, ZodError } from 'zod';
import { repairJsonEscapes } from '../lib/repair-json-escapes';


const host = process.env.OLLAMA_URL;
const modelName = process.env.OLLAMA_MODEL_NAME;


console.log(host);
if (!host) {
    throw new Error('Environment variable OLLAMA_URL must be set');
}

if (!modelName) {
    throw new Error('Environment variable OLLAMA_MODEL_NAME must be set');
}

const ollama = new Ollama({
    host: host
});

const MAX_RETRIES = 2;

export async function call_ollama<T extends ZodRawShape>(prompt: string, schema: ZodObject<T>, modelOverride?: string): Promise<z.infer<ZodObject<T>>> {
    let lastError: unknown;
    const model = modelOverride || (modelName as string);
    console.log(`[ollama] Using model: ${model}, override: ${modelOverride}`);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ollama.chat({
                model,
                messages: [{ role: 'user', content: prompt }],
                format: toJSONSchema(schema),
                think: false,
                options: {
                    num_predict: 2048,
                    temperature: 0,
                    repeat_penalty: 1.0
                }
            });
            // console.log(response)
            if (!response.message?.content) {
                throw new Error('Ollama returned an empty response.');
            }

            const content = response.message.content;
            // The model sometimes under-escapes backslashes in JSON (e.g. "\frac"),
            // which JSON.parse corrupts or rejects. Repair before parsing (Fix B).
            const repaired = repairJsonEscapes(content);
            if (repaired !== content && process.env.NODE_ENV !== 'production') {
                console.warn('[ollama] model under-escaped backslashes in JSON; repaired before parse (the prompt-level escaping rule may need attention)');
            }
            return schema.parse(JSON.parse(repaired));

        } catch (error: unknown) {
            lastError = error;

            // Don't retry on client/server errors or unexpected errors
            if (typeof error === 'object' && error !== null && 'status' in error) {
                const status = (error as { status: number }).status;
                const msg = error instanceof Error ? error.message : String(error);
                if (status >= 500 && status < 600) {
                    throw new Error(`Ollama Server is down (${status}): ${msg}`);
                }
                if (status >= 400 && status < 500) {
                    console.error("Ollama Error Details:", msg);
                    throw new Error(`Ollama Client Error (${status}): ${msg}`);
                }
            }

            // Retry on JSON parse failure or schema validation failure (model sometimes
            // returns free-form text instead of structured JSON despite the format constraint)
            if (error instanceof SyntaxError || error instanceof ZodError) {
                if (attempt < MAX_RETRIES) {
                    console.warn(`[ollama] attempt ${attempt + 1}/${MAX_RETRIES + 1} failed (${error instanceof SyntaxError ? 'invalid JSON' : 'schema mismatch'}), retrying...`);
                    continue;
                }
            }

            if (error instanceof SyntaxError) {
                console.error("Model returned invalid JSON:", error.message);
                throw new Error("Model failed to generate valid JSON.");
            }

            if (error instanceof ZodError) {
                console.error("Schema validation failed:", error.issues);
                throw new Error("Generated content does not match the required schema.");
            }
            console.log('Unexpected error occurred:');
            console.log(error);
            throw error;
        }
    }

    throw lastError;
}
