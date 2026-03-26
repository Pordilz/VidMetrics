'use client';

import { VideoStats } from '@/lib/youtube';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { Flame } from 'lucide-react';

interface VideoTableProps {
  videos: VideoStats[];
  allVideos: VideoStats[]; // Used to calculate the 75th percentile across the full dataset
}

export function VideoTable({ videos, allVideos }: VideoTableProps) {
  const formatNumber = (numStr: string | number) => {
    const num = typeof numStr === 'string' ? parseInt(numStr, 10) : numStr;
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
  };

  // Calculate 75th percentile for trending
  const sortedViews = [...allVideos].map(v => parseInt(v.viewCount)).sort((a, b) => a - b);
  const p75Index = Math.floor(sortedViews.length * 0.75);
  const p75Threshold = sortedViews[p75Index] || 0;

  const isTrending = (video: VideoStats) => {
    const daysOld = differenceInDays(new Date(), new Date(video.publishedAt));
    const views = parseInt(video.viewCount);
    return daysOld <= 14 && views >= p75Threshold;
  };

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[120px]">Video</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="text-right">Views</TableHead>
            <TableHead className="text-right">Likes</TableHead>
            <TableHead className="text-right">Engagement</TableHead>
            <TableHead className="text-right">Published</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.map((video) => (
            <TableRow key={video.id} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <img src={video.thumbnails.medium.url} alt="thumbnail" className="aspect-video w-32 rounded-md object-cover border border-border" />
              </TableCell>
              <TableCell className="font-medium max-w-[300px]" title={video.title}>
                <div className="flex flex-col items-start gap-2">
                  <span className="line-clamp-2">{video.title}</span>
                  {isTrending(video) && (
                    <Badge variant="default" className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Trending
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">{formatNumber(video.viewCount)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{formatNumber(video.likeCount)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={parseFloat(video.engagementRate || '0') > 4 ? 'default' : 'secondary'} className="font-mono">
                  {video.engagementRate}%
                </Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground whitespace-nowrap text-sm">
                {formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
          {videos.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No videos found matching the criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
