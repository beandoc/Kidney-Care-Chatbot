'use server';
/**
 * @fileOverview An AI agent that extracts precise answers from a verified kidney health database.
 *
 * - extractAnswer - A function that handles the information retrieval process.
 * - ExtractAnswerInput - The input type for the extractAnswer function.
 * - ExtractAnswerOutput - The return type for the extractAnswer function.
 */

import {ai} from '@/ai/genkit';
import {Message, Role} from 'genkit';
import {z} from 'genkit';
import { getRelevantDocuments } from '@/services/knowledge-base';

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ExtractAnswerInputSchema = z.object({
  question: z
    .string()
    .describe('The question asked by the user in English, Hindi, or Marathi.'),
  history: z.array(HistoryMessageSchema).optional().describe('The conversation history.'),
});
export type ExtractAnswerInput = z.infer<typeof ExtractAnswerInputSchema>;

const ExtractAnswerOutputSchema = z.object({
  answer: z.string().describe('The precise answer from the kidney health database.'),
});
export type ExtractAnswerOutput = z.infer<typeof ExtractAnswerOutputSchema>;

export async function extractAnswer(input: ExtractAnswerInput): Promise<ExtractAnswerOutput> {
  return extractAnswerFlow(input);
}

const systemPrompt = `You are an AI assistant providing information to kidney patients. You have access to a verified kidney health database.

Detect the language of the user's question (English, Hindi, or Marathi) and respond in the same language.

Provide a precise answer to the user's question, using only information from the provided context. Do not make up answers or provide information from other sources.
If the provided context does not contain the answer to the question, respond that you cannot answer the question because the information is not available in the database.

Use the conversation history to understand the context of the user's question.`;


const extractAnswerFlow = ai.defineFlow(
  {
    name: 'extractAnswerFlow',
    inputSchema: ExtractAnswerInputSchema,
    outputSchema: ExtractAnswerOutputSchema,
  },
  async input => {
    const history = (input.history || []).map(
      (msg) => new Message(msg.role as Role, msg.content)
    );
    
    const relevantDocs = await getRelevantDocuments(input.question);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

    const prompt = `CONTEXT:
${context}

QUESTION:
${input.question}`;

    const {output} = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      history,
      prompt: prompt,
      system: systemPrompt,
      output: {
        schema: ExtractAnswerOutputSchema,
      },
    });
    return output!;
  }
);
