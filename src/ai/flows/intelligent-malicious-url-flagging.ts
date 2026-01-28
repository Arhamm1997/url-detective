'use server';
/**
 * @fileOverview A Genkit flow for intelligently flagging potentially malicious URLs using AI.
 *
 * - intelligentMaliciousURLFlagging - A function that handles the URL flagging process.
 * - IntelligentMaliciousURLFlaggingInput - The input type for the intelligentMaliciousURLFlagging function.
 * - IntelligentMaliciousURLFlaggingOutput - The return type for the intelligentMaliciousURLFlagging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentMaliciousURLFlaggingInputSchema = z.object({
  url: z.string().url().describe('The URL to check for malicious content.'),
});
export type IntelligentMaliciousURLFlaggingInput = z.infer<typeof IntelligentMaliciousURLFlaggingInputSchema>;

const IntelligentMaliciousURLFlaggingOutputSchema = z.object({
  isMalicious: z.boolean().describe('Whether the URL is flagged as potentially malicious.'),
  reason: z.string().optional().describe('The reason why the URL was flagged as potentially malicious.'),
});
export type IntelligentMaliciousURLFlaggingOutput = z.infer<typeof IntelligentMaliciousURLFlaggingOutputSchema>;

export async function intelligentMaliciousURLFlagging(input: IntelligentMaliciousURLFlaggingInput): Promise<IntelligentMaliciousURLFlaggingOutput> {
  return intelligentMaliciousURLFlaggingFlow(input);
}

const intelligentMaliciousURLFlaggingPrompt = ai.definePrompt({
  name: 'intelligentMaliciousURLFlaggingPrompt',
  input: {schema: IntelligentMaliciousURLFlaggingInputSchema},
  output: {schema: IntelligentMaliciousURLFlaggingOutputSchema},
  prompt: `You are an AI assistant specializing in identifying potentially malicious URLs.

  Analyze the provided URL and determine if it is likely to be malicious based on your knowledge and publicly available threat intelligence feeds.

  Return a JSON object indicating whether the URL is malicious and, if so, the reason for the classification.

  URL: {{{url}}}

  Consider factors such as:
  - Known phishing domains
  - Malware distribution sites
  - Suspicious URL patterns
  - Presence on threat intelligence blacklists
  `,
});

const intelligentMaliciousURLFlaggingFlow = ai.defineFlow(
  {
    name: 'intelligentMaliciousURLFlaggingFlow',
    inputSchema: IntelligentMaliciousURLFlaggingInputSchema,
    outputSchema: IntelligentMaliciousURLFlaggingOutputSchema,
  },
  async input => {
    const {output} = await intelligentMaliciousURLFlaggingPrompt(input);
    return output!;
  }
);
