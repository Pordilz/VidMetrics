'use client';

import { VideoStats } from '@/lib/youtube';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VideoChartProps {
  videos: VideoStats[];
}

export function VideoChart({ videos }: VideoChartProps) {
  // Get top 10 videos by view count
  const sorted = [...videos].sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount)).slice(0, 10);
  
  const data = sorted.map(v => ({
    name: v.title.length > 30 ? v.title.substring(0, 30) + '...' : v.title,
    fullTitle: v.title,
    views: parseInt(v.viewCount),
    likes: parseInt(v.likeCount),
  })).reverse(); 

  const formatYAxis = (tickItem: any) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(tickItem);
  };

  if (!videos || videos.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Top 10 Videos by Views</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickFormatter={formatYAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="name" type="category" width={150} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTitle || label}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: '#3B82F6' }}
              />
              <Bar dataKey="views" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
