'use server';

export type UrlStatusResult = {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  responseTime: number;
  error?: string;
};

async function checkSingleUrl(url: string): Promise<UrlStatusResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'URLStatusChecker/1.0',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    const endTime = Date.now();

    return {
      url,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      responseTime: endTime - startTime,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const endTime = Date.now();
    let errorMessage = 'An unknown error occurred.';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out after 5 seconds.';
    } else if (error instanceof TypeError) {
      errorMessage = `Network error or invalid URL format.`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      url,
      finalUrl: url,
      status: 0, // Using 0 for errors
      statusText: 'Error',
      responseTime: endTime - startTime,
      error: errorMessage,
    };
  }
}

export async function checkUrlStatuses(urls: string[]): Promise<UrlStatusResult[]> {
  const results = await Promise.all(urls.map(url => checkSingleUrl(url)));
  return results;
}
