'use server';
/**
 * @fileOverview An AI agent that transcribes audio to text.
 *
 * - transcribeAudio - A function that handles the audio transcription.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import {ai, textModel} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data to be transcribed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}


const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async input => {
    const prompt = `Transcribe the following audio recording.

Audio: {{media url=audioDataUri}}`;

    let model = textModel[0];
    try {
        const {output} = await ai.generate({
            model: model,
            prompt: prompt,
            input: input,
            output: { schema: TranscribeAudioOutputSchema }
        });
        return output!;
    } catch (e) {
        console.error(`Error with model ${model}, trying fallback`, e);
        model = textModel[1];
        const {output} = await ai.generate({
            model: model,
            prompt: prompt,
            input: input,
            output: { schema: TranscribeAudioOutputSchema }
        });
        return output!;
    }
  }
);
