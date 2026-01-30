'use server';

export type UrlStatusResult = {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  responseTime: number;
  error?: string;
  method?: string; // Which method worked
};

// Strategy 1: HEAD request (fastest)
async function tryHeadRequest(url: string, timeout: number): Promise<UrlStatusResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      responseTime: Date.now() - startTime,
      method: 'HEAD',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return null; // Try next method
  }
}

// Strategy 2: GET request (more reliable)
async function tryGetRequest(url: string, timeout: number): Promise<UrlStatusResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    return {
      url,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      responseTime: Date.now() - startTime,
      method: 'GET',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

// Strategy 3: Try with www prefix
async function tryWithWww(url: string, timeout: number): Promise<UrlStatusResult | null> {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.startsWith('www.')) {
      const wwwUrl = `${urlObj.protocol}//www.${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;
      return await tryGetRequest(wwwUrl, timeout);
    }
  } catch (error) {
    // Invalid URL
  }
  return null;
}

// Strategy 4: Try without www prefix
async function tryWithoutWww(url: string, timeout: number): Promise<UrlStatusResult | null> {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.startsWith('www.')) {
      const nonWwwUrl = `${urlObj.protocol}//${urlObj.hostname.replace('www.', '')}${urlObj.pathname}${urlObj.search}`;
      return await tryGetRequest(nonWwwUrl, timeout);
    }
  } catch (error) {
    // Invalid URL
  }
  return null;
}

// Strategy 5: Try switching protocol (https to http or vice versa)
async function trySwitchProtocol(url: string, timeout: number): Promise<UrlStatusResult | null> {
  try {
    const urlObj = new URL(url);
    const newProtocol = urlObj.protocol === 'https:' ? 'http:' : 'https:';
    const newUrl = `${newProtocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;
    return await tryGetRequest(newUrl, timeout);
  } catch (error) {
    // Invalid URL
  }
  return null;
}

// Main intelligent checker
async function checkSingleUrl(url: string): Promise<UrlStatusResult> {
  const startTime = Date.now();
  
  // Normalize URL
  let urlToCheck = url.trim();
  if (!urlToCheck.startsWith('http://') && !urlToCheck.startsWith('https://')) {
    urlToCheck = `https://${urlToCheck}`;
  }
  
  // Validate URL format
  try {
    new URL(urlToCheck);
  } catch (error) {
    return {
      url,
      finalUrl: url,
      status: 400,
      statusText: 'Invalid URL',
      responseTime: Date.now() - startTime,
      error: 'Invalid URL format',
      method: 'validation',
    };
  }
  
  // Try strategies in order of speed and reliability
  const strategies = [
    { name: 'HEAD request', fn: () => tryHeadRequest(urlToCheck, 8000) },
    { name: 'GET request', fn: () => tryGetRequest(urlToCheck, 8000) },
    { name: 'with www', fn: () => tryWithWww(urlToCheck, 8000) },
    { name: 'without www', fn: () => tryWithoutWww(urlToCheck, 8000) },
    { name: 'switch protocol', fn: () => trySwitchProtocol(urlToCheck, 8000) },
  ];
  
  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      if (result && result.status >= 200 && result.status < 400) {
        // Success! Return immediately
        return result;
      }
      // If we got a response but it's an error code, save it as backup
      if (result && result.status >= 400) {
        // Continue trying other strategies, but keep this as fallback
        continue;
      }
    } catch (error) {
      // Strategy failed, try next
      continue;
    }
  }
  
  // All strategies failed - return detailed error
  return {
    url,
    finalUrl: urlToCheck,
    status: 0,
    statusText: 'Unreachable',
    responseTime: Date.now() - startTime,
    error: 'All connection attempts failed. Site may be down, blocking server requests, or behind Cloudflare/firewall.',
    method: 'failed',
  };
}

// Intelligent batch processing with adaptive timing
export async function checkUrlStatuses(urls: string[]): Promise<UrlStatusResult[]> {
  const results: UrlStatusResult[] = [];
  const totalUrls = urls.length;
  
  // Adaptive batch size based on total URLs
  let batchSize = 5;
  if (totalUrls > 100) batchSize = 10;
  if (totalUrls > 500) batchSize = 15;
  
  console.log(`Checking ${totalUrls} URLs in batches of ${batchSize}...`);
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchStartTime = Date.now();
    
    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map(url => checkSingleUrl(url))
    );
    
    results.push(...batchResults);
    
    const batchTime = Date.now() - batchStartTime;
    const progress = Math.round(((i + batch.length) / totalUrls) * 100);
    
    console.log(`Progress: ${progress}% (${i + batch.length}/${totalUrls}) - Batch took ${batchTime}ms`);
    
    // Adaptive delay based on batch performance
    if (i + batchSize < urls.length) {
      const delay = batchTime > 10000 ? 500 : 100; // Longer delay if batch was slow
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Summary statistics
  const successCount = results.filter(r => r.status >= 200 && r.status < 400).length;
  const errorCount = results.filter(r => r.status === 0).length;
  const clientErrorCount = results.filter(r => r.status >= 400 && r.status < 500).length;
  const serverErrorCount = results.filter(r => r.status >= 500).length;
  
  console.log('\n=== URL Check Summary ===');
  console.log(`Total URLs: ${totalUrls}`);
  console.log(`✅ Live: ${successCount}`);
  console.log(`❌ Unreachable: ${errorCount}`);
  console.log(`⚠️ Client Errors (4xx): ${clientErrorCount}`);
  console.log(`🔥 Server Errors (5xx): ${serverErrorCount}`);
  
  return results;
}

// Helper function to export results to CSV format
export function resultsToCSV(results: UrlStatusResult[]): string {
  const headers = ['URL', 'Final URL', 'Status', 'Status Text', 'Response Time (ms)', 'Method', 'Error'];
  const rows = results.map(r => [
    r.url,
    r.finalUrl,
    r.status.toString(),
    r.statusText,
    r.responseTime.toString(),
    r.method || '',
    r.error || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}
