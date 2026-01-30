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


export async function fetchGoogleSheet(url: string): Promise<string> {
  if (!url.startsWith('https://docs.google.com/spreadsheets/d/')) {
    throw new Error('Invalid Google Sheet URL. Please use a valid shareable link.');
  }

  try {
    const sheetIdRegex = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(sheetIdRegex);
    if (!match || !match[1]) {
      throw new Error('Could not extract Sheet ID from the URL.');
    }
    const sheetId = match[1];

    // Assumes the first sheet is the target
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data. Status: ${response.statusText}`);
    }

    const csvText = await response.text();
    return csvText;

  } catch (error: any) {
    console.error('Google Sheet fetch error:', error);
    throw new Error(error.message || 'An unknown error occurred while fetching the sheet.');
  }
}
