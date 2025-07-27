import { z } from "genkit";

// --- Types for ExtractAnswer ---
export const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type HistoryMessage = z.infer<typeof HistoryMessageSchema>;

export const ExtractAnswerInputSchema = z.object({
  question: z
    .string()
    .describe('The question asked by the user in English, Hindi, or Marathi.'),
  history: z.array(HistoryMessageSchema).optional().describe('The conversation history.'),
});
export type ExtractAnswerInput = z.infer<typeof ExtractAnswerInputSchema>;

export const ExtractAnswerOutputSchema = z.object({
  answer: z.string().describe('The precise answer from the kidney health database.'),
});
export type ExtractAnswerOutput = z.infer<typeof ExtractAnswerOutputSchema>;


// --- Types for AnalyzeFoodImage ---
export const AnalyzeFoodImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a food item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().optional().describe('An optional question about the food in the image.'),
});
export type AnalyzeFoodImageInput = z.infer<typeof AnalyzeFoodImageInputSchema>;

export const AnalyzeFoodImageOutputSchema = z.object({
  foodName: z.string().describe('The name of the food identified in the image.'),
  calories: z.number().describe('The estimated number of calories in the food item.'),
  protein: z.number().describe('The estimated amount of protein in grams.'),
  answer: z.string().optional().describe('The answer to the user\'s question about the image.'),
});
export type AnalyzeFoodImageOutput = z.infer<typeof AnalyzeFoodImageOutputSchema>;

// --- Types for TranscribeAudio ---
export const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data to be transcribed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

export const TranscribeAudioOutputSchema = z.object({
  transcript: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;


// --- Types for TextToSpeech ---
export const TextToSpeechInputSchema = z.string();
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

export const TextToSpeechOutputSchema = z.object({
    audioDataUri: z.string().describe("The text-to-speech audio as a data URI."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;
