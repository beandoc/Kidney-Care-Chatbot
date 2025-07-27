'use server';

import {createNextApiHandler} from '@genkit-ai/next';

// Import your flows here.
import '@/ai/flows/extract-answer-from-db';
import '@/ai/flows/analyze-food-image';
import '@/ai/flows/transcribe-audio';

export const {GET, POST} = createNextApiHandler();
