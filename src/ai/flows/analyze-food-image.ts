'use server';
/**
 * @fileOverview An AI agent that analyzes a food image to identify it and estimate its nutritional content.
 *
 * - analyzeFoodImage - A function that handles the food image analysis.
 * - AnalyzeFoodImageInput - The input type for the analyzeFoodImage function.
 * - AnalyzeFoodImageOutput - The return type for the analyzeFoodImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFoodImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a food item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().optional().describe('An optional question about the food in the image.'),
});
export type AnalyzeFoodImageInput = z.infer<typeof AnalyzeFoodImageInputSchema>;

const AnalyzeFoodImageOutputSchema = z.object({
  foodName: z.string().describe('The name of the food identified in the image.'),
  calories: z.number().describe('The estimated number of calories in the food item.'),
  protein: z.number().describe('The estimated amount of protein in grams.'),
  answer: z.string().optional().describe('The answer to the user\'s question about the image.'),
});
export type AnalyzeFoodImageOutput = z.infer<typeof AnalyzeFoodImageOutputSchema>;

export async function analyzeFoodImage(input: AnalyzeFoodImageInput): Promise<AnalyzeFoodImageOutput> {
  return analyzeFoodImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeFoodImagePrompt',
  input: {schema: AnalyzeFoodImageInputSchema},
  output: {schema: AnalyzeFoodImageOutputSchema},
  prompt: `You are a helpful nutrition assistant. Analyze the food in the following image.
{{#if question}}
Answer the user's question: {{{question}}}
In addition to answering the question, provide an estimate for the food's name, calories and protein content.
{{else}}
Provide an estimate for its name, calories and protein content.
{{/if}}

Image: {{media url=photoDataUri}}`,
});

const analyzeFoodImageFlow = ai.defineFlow(
  {
    name: 'analyzeFoodImageFlow',
    inputSchema: AnalyzeFoodImageInputSchema,
    outputSchema: AnalyzeFoodImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
