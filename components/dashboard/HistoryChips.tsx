'use client';

import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

interface HistoryChipsProps {
  history: string[];
  onSelect: (url: string) => void;
}

export function HistoryChips({ history, onSelect }: HistoryChipsProps) {
  if (history.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground flex-wrap">
      <History className="w-4 h-4" />
      <span>Recent:</span>
      {history.map((url, i) => (
        <Badge 
          key={i} 
          variant="secondary" 
          className="cursor-pointer hover:bg-secondary/80 transition-colors"
          onClick={() => onSelect(url)}
        >
          {url.length > 30 ? url.substring(0, 30) + '...' : url}
        </Badge>
      ))}
    </div>
  );
}
