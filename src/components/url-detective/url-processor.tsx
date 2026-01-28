'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Copy,
  Download,
  FileJson,
  FileText,
  Loader2,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

import { checkUrl } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type UrlStatus = 'NEW' | 'DUPLICATE';

type ProcessedUrl = {
  id: string;
  url: string;
  status: UrlStatus;
  count: number;
};

type MaliciousFlag = {
  isMalicious: boolean;
  reason?: string;
  isLoading: boolean;
};

type Stats = {
  total: number;
  unique: number;
  duplicates: number;
};

export default function UrlProcessor() {
  const [text, setText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [results, setResults] = useState<ProcessedUrl[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    unique: 0,
    duplicates: 0,
  });
  const [maliciousFlags, setMaliciousFlags] = useState<Map<string, MaliciousFlag>>(
    new Map()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, startScanning] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(text);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const lines = debouncedText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const urlCounts = new Map<string, number>();
    lines.forEach((line) => {
      urlCounts.set(line, (urlCounts.get(line) || 0) + 1);
    });

    const seenUrls = new Set<string>();
    const processed: ProcessedUrl[] = lines.map((url, index) => {
      const isFirstOccurrence = !seenUrls.has(url);
      if (isFirstOccurrence) {
        seenUrls.add(url);
      }
      return {
        id: `${url}-${index}`,
        url,
        status: isFirstOccurrence ? 'NEW' : 'DUPLICATE',
        count: urlCounts.get(url) || 1,
      };
    });

    setResults(processed);

    const uniqueCount = seenUrls.size;
    const totalCount = lines.length;
    setStats({
      total: totalCount,
      unique: uniqueCount,
      duplicates: totalCount - uniqueCount,
    });
  }, [debouncedText]);

  const filteredResults = useMemo(() => {
    if (!searchTerm) return results;
    return results.filter((r) =>
      r.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [results, searchTerm]);

  const handleClear = useCallback(() => {
    setText('');
    setSearchTerm('');
    setMaliciousFlags(new Map());
  }, []);

  const handleCopyToClipboard = useCallback(async (content: string, name: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied to Clipboard',
        description: `${name} have been copied successfully.`,
        action: <CheckCircle2 className="text-green-500" />,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy to clipboard. Please try again.',
      });
    }
  }, [toast]);

  const handleCopyUnique = useCallback(() => {
    const uniqueUrls = Array.from(
      new Set(results.filter((r) => r.status === 'NEW').map((r) => r.url))
    ).join('\n');
    if (uniqueUrls) {
      handleCopyToClipboard(uniqueUrls, 'Unique URLs');
    } else {
      toast({
        variant: 'destructive',
        title: 'Nothing to Copy',
        description: 'There are no unique URLs to copy.',
      });
    }
  }, [results, handleCopyToClipboard, toast]);

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleExport = useCallback((format: 'csv' | 'json') => {
    if (results.length === 0) {
        toast({ variant: 'destructive', title: 'Nothing to Export', description: 'There are no results to export.' });
        return;
    }
    if (format === 'json') {
      const json = JSON.stringify(results, null, 2);
      downloadFile(json, 'url-detective-results.json', 'application/json');
    } else {
      const csvHeader = 'URL,Status,Count\n';
      const csvBody = results.map(r => `"${r.url.replace(/"/g, '""')}",${r.status},${r.count}`).join('\n');
      downloadFile(csvHeader + csvBody, 'url-detective-results.csv', 'text/csv');
    }
  }, [results, toast]);

  const handleScanMalicious = useCallback(() => {
    const uniqueUrls = Array.from(new Set(results.map((r) => r.url)));
    if (uniqueUrls.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No URLs to Scan',
        description: 'Please enter some URLs before scanning.',
      });
      return;
    }

    startScanning(() => {
      setMaliciousFlags((prev) => {
        const newFlags = new Map(prev);
        uniqueUrls.forEach((url) => {
          newFlags.set(url, { ...newFlags.get(url), isLoading: true });
        });
        return newFlags;
      });

      Promise.all(
        uniqueUrls.map(async (url) => {
          const result = await checkUrl(url);
          setMaliciousFlags((prev) => {
            const newFlags = new Map(prev);
            newFlags.set(url, { ...result, isLoading: false });
            return newFlags;
          });
        })
      );
    });
  }, [results, toast]);

  const statCards = [
    { title: 'Total URLs', value: stats.total, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Unique URLs', value: stats.unique, icon: <Copy className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Duplicate URLs', value: stats.duplicates, icon: <ClipboardCopy className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <h1 className="font-headline text-2xl font-bold text-primary">
              URL Detective
            </h1>
          </div>
        </header>

        <main className="container mx-auto flex-1 p-4 md:p-8">
          <div className="grid gap-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {statCards.map((stat, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {stat.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="relative">
                  <Textarea
                    placeholder="Paste your URLs here, one per line..."
                    className="min-h-[200px] w-full resize-y pr-12 text-base"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  {text && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-muted-foreground"
                      onClick={handleClear}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search URLs..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleCopyUnique} variant="outline">
                      <Copy className="mr-2 h-4 w-4" /> Copy Unique
                    </Button>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport('csv')}>
                            <FileText className="mr-2 h-4 w-4" />
                            Export as CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport('json')}>
                            <FileJson className="mr-2 h-4 w-4" />
                            Export as JSON
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    <Button onClick={handleScanMalicious} disabled={isScanning}>
                      {isScanning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="mr-2 h-4 w-4" />
                      )}
                      Scan URLs
                    </Button>
                  </div>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-2/3">URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead className="text-right">Threat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((item) => {
                        const flag = maliciousFlags.get(item.url);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="max-w-xs truncate font-mono text-sm">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{item.url}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{item.url}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  item.status === 'NEW'
                                    ? 'border-green-500/50 text-green-600 dark:text-green-400'
                                    : 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                                )}
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.count > 1 ? item.count : '-'}</TableCell>
                            <TableCell className="text-right">
                              {flag?.isLoading ? (
                                <Loader2 className="inline-block h-4 w-4 animate-spin text-muted-foreground" />
                              ) : flag?.isMalicious ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="inline-block h-5 w-5 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs font-semibold text-destructive">
                                      Potentially Malicious
                                    </p>
                                    <p className="max-w-xs text-sm text-muted-foreground">
                                      {flag.reason}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : flag && !flag.isMalicious ? (
                                <Tooltip>
                                <TooltipTrigger>
                                  <CheckCircle2 className="inline-block h-5 w-5 text-green-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Scanned: No threats detected</p>
                                </TooltipContent>
                              </Tooltip>
                              ): null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredResults.length === 0 && (
                     <div className="p-8 text-center text-muted-foreground">No matching URLs found.</div>
                  )}
                </Card>
              </div>
            )}
             {results.length === 0 && text.length > 0 && debouncedText.length > 0 && (
                <Card className="flex items-center justify-center p-12">
                    <p className="text-muted-foreground">No valid URLs found in the input.</p>
                </Card>
             )}
          </div>
        </main>
        <footer className="border-t">
          <div className="container mx-auto flex h-14 items-center justify-center px-4">
            <p className="text-sm text-muted-foreground">
              Built with Next.js and Genkit.
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
