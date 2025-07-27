"use server";

import { Message, Role } from 'genkit';
import { z } from "genkit";
import { ai } from "@/ai/genkit";
import { getKnowledgeBaseContent } from '@/services/knowledge-base';
import wav from 'wav';

// --- Types for ExtractAnswer ---
const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
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


// Server Action for getting a response from the knowledge base
export async function getAiResponse(input: ExtractAnswerInput): Promise<ExtractAnswerOutput> {
  if (!input.question) {
    throw new Error("Question cannot be empty.");
  }
  
  const systemPrompt = `You are an AI assistant providing information to kidney patients. You have access to a verified kidney health database.

Detect the language of the user's question (English, Hindi, or Marathi) and respond in the same language.

Provide a precise answer to the user's question, using only information from the provided context. Do not make up answers or provide information from other sources.
If the provided context does not contain the answer to the question, respond that you cannot answer the question because the information is not available in the database.

Use the conversation history to understand the context of the user's question.`;

  const history = (input.history || []).map(
    (msg) => new Message(msg.role as Role, msg.content)
  );

  const knowledgeBaseContent = await getKnowledgeBaseContent();
  
  const context = knowledgeBaseContent;

  const prompt = `CONTEXT:
${context}

QUESTION:
${input.question}`;

  const {output} = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    history,
    prompt: prompt,
    system: systemPrompt,
    output: {
      schema: ExtractAnswerOutputSchema,
    },
  });
  return output!;
}

// Server action for analyzing a food image
export async function getFoodAnalysis(input: AnalyzeFoodImageInput): Promise<AnalyzeFoodImageOutput> {
  if (!input.photoDataUri) {
    throw new Error("Image data cannot be empty.");
  }

  const promptTemplate = `You are a helpful nutrition assistant. Analyze the food in the following image.
{{#if question}}
Answer the user's question: {{{question}}}
In addition to answering the question, provide an estimate for the food's name, calories and protein content.
{{else}}
Provide an estimate for its name, calories and protein content.
{{/if}}

Image: {{media url=photoDataUri}}`
  
  const {output} = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    prompt: promptTemplate,
    input: input,
    output: { schema: AnalyzeFoodImageOutputSchema }
  });
  return output!;
}

// Server action for transcribing audio
export async function getTranscript(audioDataUri: string): Promise<TranscribeAudioOutput> {
  if (!audioDataUri) {
    throw new Error("Audio data cannot be empty.");
  }
  
  const promptTemplate = `Transcribe the following audio recording.

Audio: {{media url=audioDataUri}}`;

  const {output} = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    prompt: promptTemplate,
    input: { audioDataUri },
    output: { schema: TranscribeAudioOutputSchema }
  });
  return output!;
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

// Server action for text-to-speech
export async function getAudioResponse(text: string): Promise<TextToSpeechOutput> {
  if (!text) {
    throw new Error("Text cannot be empty.");
  }
  
  const { media } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-preview-tts',
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Algenib' },
        },
      },
    },
    prompt: text,
  });
  if (!media) {
    throw new Error('no media returned');
  }
  const audioBuffer = Buffer.from(
    media.url.substring(media.url.indexOf(',') + 1),
    'base64'
  );
  const audioDataUri = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
  return { audioDataUri };
}
