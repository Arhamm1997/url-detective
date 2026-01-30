'use client';

import { fetchGoogleSheet } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Link as LinkIcon, Loader2 } from 'lucide-react';
import React, { useState, useTransition } from 'react';
import * as XLSX from 'xlsx';

type UrlImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (urls: string) => void;
};

export function UrlImportDialog({ open, onOpenChange, onImport }: UrlImportDialogProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isFetching, startFetching] = useTransition();
  const [isParsing, startParsing] = useTransition();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    startParsing(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error('File is empty.');

          let urls: string[] = [];
          const fileType = file.name.split('.').pop()?.toLowerCase();

          if (fileType === 'txt') {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
            urls = text.split('\n').map(line => line.trim()).filter(Boolean);
          } else { // Handle csv, xls, xlsx with xlsx library
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Find the first column with content and assume it's the URL column
            let urlColumnIndex = -1;
            if (json.length > 0) {
              for (let i = 0; i < json[0].length; i++) {
                if (json.some(row => row[i] && row[i].toString().trim())) {
                  urlColumnIndex = i;
                  break;
                }
              }
            }

            if (urlColumnIndex !== -1) {
              urls = json.map(row => row[urlColumnIndex]?.toString().trim()).filter(Boolean);
            }
          }
          
          if (urls.length === 0) {
            throw new Error('No URLs found in the file.');
          }

          onImport(urls.join('\n'));
          onOpenChange(false);
          toast({ title: 'Import Successful', description: `${urls.length} URLs have been imported.` });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        }
      };
      
      reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not read the file.' });
      }

      reader.readAsBinaryString(file);
    });
    // Reset file input
    if(event.target) event.target.value = '';
  };

  const handleImportFromSheet = () => {
    if (!sheetUrl) {
      toast({ variant: 'destructive', title: 'URL is required' });
      return;
    }
    startFetching(async () => {
      try {
        const csvText = await fetchGoogleSheet(sheetUrl);
        const workbook = XLSX.read(csvText, { type: 'string', raw: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const urls = json.map(row => row[0]?.toString().trim()).filter(url => url && url.startsWith('http'));
        
        if (urls.length === 0) {
          throw new Error('No valid URLs found in the Google Sheet.');
        }
        
        onImport(urls.join('\n'));
        onOpenChange(false);
        setSheetUrl('');
        toast({ title: 'Import Successful', description: `${urls.length} URLs have been imported from Google Sheet.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import URLs</DialogTitle>
          <DialogDescription>
            Import URLs from a file or a public Google Sheet. The first column will be used to extract URLs.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="file">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file"><FileUp className="mr-2 h-4 w-4" />From File</TabsTrigger>
            <TabsTrigger value="g-sheet"><LinkIcon className="mr-2 h-4 w-4" />From Google Sheet</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <div className="grid gap-4 py-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="url-file">File</Label>
                <Input
                  id="url-file"
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  disabled={isParsing}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, TXT, XLSX, XLS.
                </p>
              </div>
               {isParsing && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing file...</div>}
            </div>
          </TabsContent>
          <TabsContent value="g-sheet">
            <div className="grid gap-4 py-4">
              <div className="grid items-center gap-1.5">
                <Label htmlFor="sheet-url">Public Google Sheet URL</Label>
                <Input
                  id="sheet-url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={isFetching}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleImportFromSheet} disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                Import from URL
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
