"use server";

import { extractAnswer, type ExtractAnswerOutput, type ExtractAnswerInput } from "@/ai/flows/extract-answer-from-db";
import { analyzeFoodImage, type AnalyzeFoodImageOutput } from "@/ai/flows/analyze-food-image";
import { transcribeAudio, type TranscribeAudioOutput } from "@/ai/flows/transcribe-audio";

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

export async function getFoodAnalysis(photoDataUri: string): Promise<AnalyzeFoodImageOutput> {
  if (!photoDataUri) {
    throw new Error("Image data cannot be empty.");
  }

  try {
    const response = await analyzeFoodImage({ photoDataUri });
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
