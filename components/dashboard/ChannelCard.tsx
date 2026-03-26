import { ChannelInfo } from '@/lib/youtube';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChannelCardProps {
  channel: ChannelInfo;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  // Format numbers to short format (e.g., 1.2M)
  const formatNumber = (numStr: string) => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
  };

  return (
    <Card className="w-full">
      <CardContent className="flex items-center gap-6 p-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={channel.thumbnails.high.url || channel.thumbnails.default.url} alt={channel.title} />
          <AvatarFallback>{channel.title[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">{channel.title}</h2>
          <p className="text-sm text-muted-foreground">{channel.customUrl}</p>
          <div className="flex gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-xl font-semibold">{formatNumber(channel.statistics.subscriberCount)}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Subscribers</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold">{formatNumber(channel.statistics.videoCount)}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Videos</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold">{formatNumber(channel.statistics.viewCount)}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Views</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
