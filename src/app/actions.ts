'use server';

import {
  intelligentMaliciousURLFlagging,
  type IntelligentMaliciousURLFlaggingOutput,
} from '@/ai/flows/intelligent-malicious-url-flagging';

export async function checkUrl(
  url: string
): Promise<IntelligentMaliciousURLFlaggingOutput> {
  try {
    const result = await intelligentMaliciousURLFlagging({ url });
    return result;
  } catch (error) {
    console.error(`Error checking URL "${url}":`, error);
    // Return a non-malicious status on error to avoid false positives.
    return { isMalicious: false, reason: 'An error occurred during analysis.' };
  }
}
