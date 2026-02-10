'use client';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronDown,
  Copy,
  Download,
  FileText,
  FileUp,
  Globe,
  History,
  Info,
  Loader2,
  Network,
  Search,
  Timer,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useMemo, useState, useTransition } from 'react';
import { checkUrlStatuses, type UrlStatusResult } from '@/app/status-checker/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UrlImportDialog } from '@/components/url-import/url-import-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type SortConfig = {
    key: keyof UrlStatusResult | 'statusGroup';
    direction: 'asc' | 'desc';
};

type StatusFilter = 'all' | 'live' | 'redirect' | 'deleted' | 'error';


export default function StatusCheckerClient() {
    const [urlsInput, setUrlsInput] = useState('');
    const [results, setResults] = useState<UrlStatusResult[]>([]);
    const [isChecking, startChecking] = useTransition();
    const [progress, setProgress] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'url', direction: 'asc' });
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    const isValidUrl = (str: string) => {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    };

    const handleCheckStatuses = useCallback(async () => {
        const urls = urlsInput.split('\n').map(u => u.trim()).filter(Boolean);
        const validUrls = urls.filter(isValidUrl);

        if (validUrls.length === 0) {
            toast({ variant: 'destructive', title: 'No valid URLs', description: 'Please enter at least one valid URL.' });
            return;
        }

        if (urls.length !== validUrls.length) {
            toast({
                title: 'Some URLs were invalid',
                description: `${urls.length - validUrls.length} invalid URL(s) were found and skipped.`,
                variant: 'default',
            });
        }
        
        setResults([]);
        setProgress(0);
        startChecking(async () => {
            const batchSize = 10;
            let allResults: UrlStatusResult[] = [];
            for (let i = 0; i < validUrls.length; i += batchSize) {
                const batch = validUrls.slice(i, i + batchSize);
                const batchResults = await checkUrlStatuses(batch);
                allResults = [...allResults, ...batchResults];
                setResults(allResults);
                setProgress(((i + batch.length) / validUrls.length) * 100);
            }
        });
    }, [urlsInput, toast]);

    const stats = useMemo(() => {
        const total = results.length;
        if (total === 0) return { total: 0, live: 0, deleted: 0, redirect: 0, error: 0, avgResponseTime: 0, successRate: 0 };
        
        let live = 0, deleted = 0, redirect = 0, error = 0, totalResponseTime = 0, successfulChecks = 0;

        results.forEach(r => {
            if (r.error) error++;
            else {
                successfulChecks++;
                totalResponseTime += r.responseTime;
                if (r.status >= 200 && r.status < 300) live++;
                else if (r.status >= 300 && r.status < 400) redirect++;
                else if (r.status >= 400 && r.status < 500) deleted++;
                else error++;
            }
        });
        
        return {
            total, live, deleted, redirect, error,
            avgResponseTime: successfulChecks > 0 ? Math.round(totalResponseTime / successfulChecks) : 0,
            successRate: total > 0 ? Math.round((live / total) * 100) : 0,
        };
    }, [results]);

    const getStatusGroup = (result: UrlStatusResult): StatusFilter => {
        if (result.error) return 'error';
        if (result.status >= 200 && result.status < 300) return 'live';
        if (result.status >= 300 && result.status < 400) return 'redirect';
        if (result.status >= 400 && result.status < 500) return 'deleted';
        return 'error';
    };

    const filteredAndSortedResults = useMemo(() => {
        return results
            .filter(r => {
                const searchLower = searchTerm.toLowerCase();
                if (statusFilter !== 'all' && getStatusGroup(r) !== statusFilter) return false;
                return r.url.toLowerCase().includes(searchLower) || r.finalUrl.toLowerCase().includes(searchLower);
            })
            .sort((a, b) => {
                const aVal = sortConfig.key === 'statusGroup' ? getStatusGroup(a) : a[sortConfig.key];
                const bVal = sortConfig.key === 'statusGroup' ? getStatusGroup(b) : b[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [results, searchTerm, statusFilter, sortConfig]);

    const requestSort = (key: keyof UrlStatusResult | 'statusGroup') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getStatusBadge = (result: UrlStatusResult) => {
        const group = getStatusGroup(result);
        const variants: Record<StatusFilter, { variant: "default" | "destructive" | "outline" | "secondary", className: string, text: string }> = {
            live: { variant: 'default', className: 'bg-green-600/20 text-green-400 border-green-500/30', text: 'Live' },
            redirect: { variant: 'default', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30', text: 'Redirect' },
            deleted: { variant: 'destructive', className: 'bg-red-600/20 text-red-400 border-red-500/30', text: 'Deleted/Client Error' },
            error: { variant: 'destructive', className: 'bg-orange-600/20 text-orange-400 border-orange-500/30', text: 'Error/Server Issue' },
            all: { variant: 'secondary', className: '', text: '' }
        };
        const { variant, className, text } = variants[group];
        return <Badge variant={variant} className={cn('font-semibold', className)}>{text}</Badge>;
    };

    const downloadFile = (content: string, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExport = (format: 'csv' | 'txt', data: UrlStatusResult[]) => {
        if (data.length === 0) {
            toast({ variant: 'destructive', title: 'Nothing to Export' });
            return;
        }
        if (format === 'csv') {
            const headers = 'Original URL,Final URL,Status,Status Text,Response Time (ms),Error\n';
            const csvBody = data.map(r => `"${r.url}","${r.finalUrl}",${r.status},"${r.statusText}",${r.responseTime},"${r.error || ''}"`).join('\n');
            downloadFile(headers + csvBody, 'url-status-results.csv', 'text/csv');
        } else {
            downloadFile(data.map(r => r.url).join('\n'), 'urls.txt', 'text/plain');
        }
    };

    const handleImport = (urls: string) => {
        setUrlsInput(prev => prev ? `${prev}\n${urls}` : urls);
    };
    
    const statCards = [
        { title: "Total URLs Checked", value: stats.total, icon: Globe },
        { title: "Live URLs", value: stats.live, icon: CheckCircle, color: "text-green-400" },
        { title: "Redirects", value: stats.redirect, icon: History, color: "text-yellow-400" },
        { title: "Client Errors (4xx)", value: stats.deleted, icon: XCircle, color: "text-red-400" },
        { title: "Server/Network Errors", value: stats.error, icon: AlertTriangle, color: "text-orange-400" },
        { title: "Avg. Response Time", value: `${stats.avgResponseTime}ms`, icon: Timer },
    ];

    const filterButtons: { label: string, value: StatusFilter, icon: React.ElementType }[] = [
        { label: 'All', value: 'all', icon: Network },
        { label: 'Live', value: 'live', icon: CheckCircle },
        { label: 'Redirects', value: 'redirect', icon: History },
        { label: 'Deleted', value: 'deleted', icon: XCircle },
        { label: 'Errors', value: 'error', icon: AlertTriangle },
    ];
    
    const tableHeaders: { key: keyof UrlStatusResult | 'statusGroup', label: string, className?: string }[] = [
        { key: 'statusGroup', label: 'Status', className: "w-[150px]" },
        { key: 'url', label: 'URL' },
        { key: 'status', label: 'Code', className: "w-[100px] text-right" },
        { key: 'responseTime', label: 'Response Time', className: "w-[150px] text-right" },
    ];


    return (
        <TooltipProvider>
            <UrlImportDialog open={isImporting} onOpenChange={setIsImporting} onImport={handleImport} />
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Bulk URL Status Checker</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Paste your URLs here, one per line, or import from a file..."
                            className="min-h-[200px] w-full resize-y text-base"
                            value={urlsInput}
                            onChange={(e) => setUrlsInput(e.target.value)}
                            disabled={isChecking}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setIsImporting(true)} variant="outline" disabled={isChecking}>
                                <FileUp className="mr-2 h-4 w-4" /> Import URLs
                            </Button>
                             <Button onClick={() => setUrlsInput('')} variant="ghost" disabled={isChecking || !urlsInput}>
                                <Trash2 className="mr-2 h-4 w-4" /> Clear
                            </Button>
                            <Button onClick={async () => setUrlsInput(await navigator.clipboard.readText())} variant="outline" disabled={isChecking}>
                                <Copy className="mr-2 h-4 w-4" /> Paste from Clipboard
                            </Button>
                            <Button onClick={handleCheckStatuses} disabled={isChecking} className="font-bold">
                                {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                                Check Statuses
                            </Button>
                        </div>
                        {isChecking && <Progress value={progress} className="w-full" />}
                    </CardContent>
                </Card>

                {results.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {statCards.map(s => (
                                <Card key={s.title}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                                        <s.icon className={cn("h-4 w-4 text-muted-foreground", s.color)} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{s.value}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col md:flex-row gap-2">
                                    <div className="relative flex-grow">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Search results..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {filterButtons.map(f => (
                                            <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.value)}>
                                                <f.icon className="mr-2 h-4 w-4" />
                                                {f.label}
                                            </Button>
                                        ))}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleExport('csv', filteredAndSortedResults)}><FileText className="mr-2 h-4 w-4" />Export Filtered as CSV</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('csv', results)}><FileText className="mr-2 h-4 w-4" />Export All as CSV</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('txt', results.filter(r => getStatusGroup(r) === 'live'))}><FileText className="mr-2 h-4 w-4" />Export Live URLs as TXT</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('txt', results.filter(r => getStatusGroup(r) === 'deleted'))}><FileText className="mr-2 h-4 w-4" />Export Deleted URLs as TXT</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {tableHeaders.map(h => (
                                                <TableHead key={h.key} className={h.className}>
                                                     <Button variant="ghost" onClick={() => requestSort(h.key)}>
                                                        {h.label}
                                                        {sortConfig.key === h.key && (sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                                                    </Button>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAndSortedResults.map(r => (
                                            <TableRow key={r.url}>
                                                <TableCell>{getStatusBadge(r)}</TableCell>
                                                <TableCell className="font-mono text-sm max-w-[300px] truncate">
                                                    <Tooltip>
                                                        <TooltipTrigger><p>{r.url}</p></TooltipTrigger>
                                                        <TooltipContent className="max-w-xl" side="bottom" align="start">
                                                            <p><b>Original:</b> {r.url}</p>
                                                            {r.url !== r.finalUrl && <p><b>Final:</b> {r.finalUrl}</p>}
                                                            {r.error && <p className="text-red-400"><b>Error:</b> {r.error}</p>}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="text-right">{r.error ? 'N/A' : r.status}</TableCell>
                                                <TableCell className="text-right">{r.responseTime} ms</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredAndSortedResults.length === 0 && <p className="text-center text-muted-foreground p-8">No results to display.</p>}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}
