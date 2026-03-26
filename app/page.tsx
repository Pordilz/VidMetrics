'use client';

import { useState, useEffect } from 'react';
import { differenceInDays, isSameMonth } from 'date-fns';
import { ChannelSearch } from '@/components/dashboard/ChannelSearch';
import { ChannelCard } from '@/components/dashboard/ChannelCard';
import { VideoTable } from '@/components/dashboard/VideoTable';
import { VideoChart } from '@/components/dashboard/VideoChart';
import { StatsFilters, SortOption, DateFilterOption } from '@/components/dashboard/StatsFilters';
import { HistoryChips } from '@/components/dashboard/HistoryChips';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ChannelInfo, VideoStats } from '@/lib/youtube';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [videos, setVideos] = useState<VideoStats[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoStats[]>([]);
  
  const [sortOption, setSortOption] = useState<SortOption>('viewsDesc');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [history, setHistory] = useState<string[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vidmetrics_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (url: string) => {
    const newHistory = [url, ...history.filter(h => h !== url)].slice(0, 5);
    setHistory(newHistory);
    try {
      localStorage.setItem('vidmetrics_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const handleSearch = async (url: string, isDemo = false) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch channel
      const channelRes = await fetch(`/api/channel?${isDemo ? 'demo=true' : `url=${encodeURIComponent(url)}`}`);
      const channelData = await channelRes.json();
      
      if (!channelRes.ok) {
        throw new Error(channelData.error || 'Failed to fetch channel');
      }

      setChannel(channelData);

      // 2. Fetch videos
      const videosRes = await fetch(`/api/videos?${isDemo ? 'demo=true' : `channelId=${encodeURIComponent(channelData.id)}`}`);
      const videosData = await videosRes.json();
      
      if (!videosRes.ok) {
        throw new Error(videosData.error || 'Failed to fetch videos');
      }

      setVideos(videosData);
      
      // Keep track of search if not a demo
      if (!isDemo) {
        saveToHistory(url);
      }
      
      // Reset filters when new channel loaded
      setSortOption('viewsDesc');
      setDateFilter('all');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      setChannel(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filtering and sorting whenever videos, sortOption, or dateFilter change
  useEffect(() => {
    let result = [...videos];

    // 1. Filter by Date
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(video => {
        const pubDate = new Date(video.publishedAt);
        if (dateFilter === 'thisMonth') {
          return isSameMonth(now, pubDate);
        } else if (dateFilter === '30days') {
          return differenceInDays(now, pubDate) <= 30;
        } else if (dateFilter === '90days') {
          return differenceInDays(now, pubDate) <= 90;
        }
        return true;
      });
    }

    // 2. Sort Data
    result.sort((a, b) => {
      switch (sortOption) {
        case 'viewsDesc':
          return parseInt(b.viewCount) - parseInt(a.viewCount);
        case 'likesDesc':
          return parseInt(b.likeCount) - parseInt(a.likeCount);
        case 'dateDesc':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'dateAsc':
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredVideos(result);
  }, [videos, sortOption, dateFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black/95 p-4 sm:p-8 pt-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-[#3B82F6]">Vid</span>Metrics
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">YouTube Competitor Analysis Dashboard</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <ChannelSearch onSearch={(url) => handleSearch(url, false)} isLoading={loading} />
            <Button variant="outline" onClick={() => handleSearch('demo', true)} disabled={loading} className="shrink-0">
              Load Demo
            </Button>
          </div>
        </div>

        {/* Search History */}
        {!channel && !loading && (
          <HistoryChips history={history} onSelect={(url) => handleSearch(url, false)} />
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="max-w-2xl animate-in fade-in zoom-in-95">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Failed</AlertTitle>
            <AlertDescription>
              {error}
              {error.includes('quota') && (
                <div className="mt-2 text-sm">
                  YouTube API limits reached. Try again tomorrow or use the Demo Mode.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && <DashboardSkeleton />}

        {/* Content Area */}
        {channel && !loading && !error && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ChannelCard channel={channel} />
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-2xl font-semibold tracking-tight">Performance Analytics</h3>
                <StatsFilters 
                  sortOption={sortOption} setSortOption={setSortOption} 
                  dateFilter={dateFilter} setDateFilter={setDateFilter} 
                />
              </div>

              <div className="grid xl:grid-cols-[1fr_400px] gap-8">
                {/* Table spans more space if needed, or Chart sits alongside */}
                <div className="overflow-hidden">
                   <VideoTable videos={filteredVideos} allVideos={videos} />
                </div>
                
                <div className="w-full xl:w-[400px]">
                  {/* The chart always uses the top 10 from filtered list if available */}
                  <VideoChart videos={filteredVideos} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
