'use server';
/**
 * @fileOverview An AI agent that extracts precise answers from a verified kidney health database.
 *
 * - extractAnswer - A function that handles the information retrieval process.
 * - ExtractAnswerInput - The input type for the extractAnswer function.
 * - ExtractAnswerOutput - The return type for the extractAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractAnswerInputSchema = z.object({
  question: z
    .string()
    .describe('The question asked by the user in English, Hindi, or Marathi.'),
});
export type ExtractAnswerInput = z.infer<typeof ExtractAnswerInputSchema>;

const ExtractAnswerOutputSchema = z.object({
  answer: z.string().describe('The precise answer from the kidney health database.'),
});
export type ExtractAnswerOutput = z.infer<typeof ExtractAnswerOutputSchema>;

export async function extractAnswer(input: ExtractAnswerInput): Promise<ExtractAnswerOutput> {
  return extractAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractAnswerPrompt',
  input: {schema: ExtractAnswerInputSchema},
  output: {schema: ExtractAnswerOutputSchema},
  prompt: `You are an AI assistant providing information to kidney patients.  You have access to a verified kidney health database.

  User's question: {{{question}}}

  Provide a precise answer to the user's question, using only information from the database. Do not make up answers or provide information from other sources.
  If the database does not contain the answer to the question, respond that you cannot answer the question because the information is not available in the database.`,
});

const extractAnswerFlow = ai.defineFlow(
  {
    name: 'extractAnswerFlow',
    inputSchema: ExtractAnswerInputSchema,
    outputSchema: ExtractAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
