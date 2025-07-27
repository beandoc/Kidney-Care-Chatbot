"use server";

import { extractAnswer, type ExtractAnswerOutput, type ExtractAnswerInput } from "@/ai/flows/extract-answer-from-db";
import { analyzeFoodImage, type AnalyzeFoodImageOutput, type AnalyzeFoodImageInput } from "@/ai/flows/analyze-food-image";
import { transcribeAudio, type TranscribeAudioOutput } from "@/ai/flows/transcribe-audio";
import { textToSpeech, type TextToSpeechOutput } from "@/ai/flows/text-to-speech";

export async function getAiResponse(input: ExtractAnswerInput): Promise<ExtractAnswerOutput> {
  if (!input.question) {
    throw new Error("Question cannot be empty.");
  }
  
  try {
    const response = await extractAnswer(input);
    return response;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to get a response from the AI assistant.");
  }
}

export async function getFoodAnalysis(input: AnalyzeFoodImageInput): Promise<AnalyzeFoodImageOutput> {
  if (!input.photoDataUri) {
    throw new Error("Image data cannot be empty.");
  }

  try {
    const response = await analyzeFoodImage(input);
    return response;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to get a response from the AI assistant.");
  }
}

export async function getTranscript(audioDataUri: string): Promise<TranscribeAudioOutput> {
  if (!audioDataUri) {
    throw new Error("Audio data cannot be empty.");
  }

  try {
    const response = await transcribeAudio({ audioDataUri });
    return response;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to get a response from the AI assistant.");
  }
}

export async function getAudioResponse(text: string): Promise<TextToSpeechOutput> {
  if (!text) {
    throw new Error("Text cannot be empty.");
  }

  try {
    const response = await textToSpeech(text);
    return response;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to get a speech response from the AI assistant.");
  }
}
