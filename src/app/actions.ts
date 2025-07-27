
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
  
  const systemPrompt = `You are a helpful AI assistant for kidney patients. Your primary goal is to answer user questions accurately and safely in the user's language.

You will be given a CONTEXT containing verified information. Follow these steps:
1.  Read the user's QUESTION and the provided CONTEXT.
2.  Determine if the CONTEXT contains enough information to fully answer the QUESTION.
3.  If the CONTEXT provides a complete answer, use only the information from the CONTEXT for your response.
4.  If the CONTEXT does NOT contain the answer, you MUST use your own general knowledge to provide a helpful and accurate answer.
5.  When, and only when, you use your general knowledge (as determined in step 4), you MUST add the following disclaimer at the very end of your response, translated into the user's language: "This information comes from my general knowledge and not the KidneyCare knowledge base. It is not a substitute for professional medical advice. Please consult your doctor."
6.  You MUST respond in the same language as the user's QUESTION.`;

  const history: HistoryMessage[] = (input.history || []).map(
    (msg) => ({
      role: msg.role as 'user' | 'model',
      content: msg.content,
    })
  );

  const knowledgeBaseContent = await getKnowledgeBaseContent();
  
  const prompt = `CONTEXT:
${knowledgeBaseContent}

QUESTION:
${input.question}

Based on the instructions, please provide the best possible answer to the question.`;

  const {output} = await ai.generate({
    model: 'googleai/gemini-1.5-flash-latest',
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
    model: 'googleai/gemini-1.5-flash-latest',
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
    model: 'googleai/gemini-1.5-flash-latest',
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
