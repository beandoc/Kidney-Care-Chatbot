"use server";

import { extractAnswer, type ExtractAnswerOutput } from "@/ai/flows/extract-answer-from-db";

export async function getAiResponse(question: string): Promise<ExtractAnswerOutput> {
  if (!question) {
    throw new Error("Question cannot be empty.");
  }
  
  try {
    const response = await extractAnswer({ question });
    return response;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to get a response from the AI assistant.");
  }
}
