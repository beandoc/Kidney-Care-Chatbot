"use server";

import { Message, Role } from 'genkit';
import { ai } from "@/ai/genkit";
import { getKnowledgeBaseContent } from '@/services/knowledge-base';
import wav from 'wav';
import {
  ExtractAnswerInput,
  ExtractAnswerOutput,
  ExtractAnswerOutputSchema,
  AnalyzeFoodImageInput,
  AnalyzeFoodImageOutput,
  AnalyzeFoodImageOutputSchema,
  TranscribeAudioOutputSchema,
  TextToSpeechOutput,
  HistoryMessage,
} from '@/lib/types';


// Server Action for getting a response from the knowledge base
export async function getAiResponse(input: ExtractAnswerInput): Promise<ExtractAnswerOutput> {
  if (!input.question) {
    throw new Error("Question cannot be empty.");
  }
  
  const systemPrompt = `Your most important instruction is to detect the language of the user's question and ALWAYS respond in that same language.

You are an AI assistant for kidney patients. Your goal is to be helpful and provide information from a verified kidney health database.

First, find the answer to the user's question using ONLY the information from the provided English context (the knowledge base). Then, translate that answer into the user's detected language.

If the provided context does not contain the answer, use your general knowledge to provide a helpful, accurate, and safe response in the user's language. When you do this, YOU MUST explicitly state that the information comes from your general knowledge and not the KidneyCare knowledge base, and that it is not a substitute for professional medical advice.

Use the conversation history to understand the context of the user's question.`;

  const history: HistoryMessage[] = (input.history || []).map(
    (msg) => ({
      role: msg.role as 'user' | 'model',
      content: msg.content,
    })
  );

  const knowledgeBaseContent = await getKnowledgeBaseContent();
  
  const context = knowledgeBaseContent;

  const prompt = `CONTEXT:
${context}

QUESTION:
${input.question}`;

  const {output} = await ai.generate({
    model: 'googleai/gemini-1.5-pro-latest',
    history: history.map(m => new Message(m.role, [{text: m.content}])),
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
    model: 'googleai/gemini-1.5-pro-latest',
    prompt: promptTemplate,
    input: input,
    output: { schema: AnalyzeFoodImageOutputSchema }
  });
  return output!;
}

// Server action for transcribing audio
export async function getTranscript(audioDataUri: string) {
  if (!audioDataUri) {
    throw new Error("Audio data cannot be empty.");
  }
  
  const promptTemplate = `Transcribe the following audio recording.

Audio: {{media url=audioDataUri}}`;

  const {output} = await ai.generate({
    model: 'googleai/gemini-1.5-pro-latest',
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
