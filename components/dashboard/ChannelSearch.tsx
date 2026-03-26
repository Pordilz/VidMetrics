'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ChannelSearchProps {
  onSearch: (url: string) => void;
  isLoading: boolean;
}

export function ChannelSearch({ onSearch, isLoading }: ChannelSearchProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSearch(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl items-center space-x-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Paste YouTube channel URL (e.g. /@MrBeast or /channel/ID)"
          className="pl-8"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" disabled={isLoading || !url.trim()}>
        {isLoading ? 'Analyzing...' : 'Analyze'}
      </Button>
    </form>
  );
}
