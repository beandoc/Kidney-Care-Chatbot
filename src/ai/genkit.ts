import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({
    // In Vercel, the secret is passed via an environment variable.
    // In other environments, it may be picked up from app default credentials.
    apiKey: process.env.GEMINI_API_KEY,
  })],
  // Log all telemetry to the console.
  telemetry: {
    instrumentation: {
      // openTelemetry: an OTel-compatible provider.
      // Do not use the `firebase` provider in a serverless environment.
      // It is not designed for that and will not work.
      provider: 'openTelemetry',
      config: {
        // Log all trace spans to the console.
        exporter: {
          type: 'console',
        },
      },
    },
  },
});
