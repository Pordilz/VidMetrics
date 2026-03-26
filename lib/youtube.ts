// YouTube API utilities
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

export interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl: string;
  publishedAt: string;
  country: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface VideoStats {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: { medium: { url: string }; high: { url: string }; maxres?: { url: string } };
  viewCount: string;
  likeCount: string;
  commentCount: string;
  engagementRate?: string;
  duration?: string;
  tags?: string[];
}

/**
 * Handle different URL formats:
 * - https://youtube.com/@MrBeast
 * - https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA
 * - https://youtube.com/c/SomeChannel
 */
export async function extractChannelHandleOrId(url: string): Promise<{ type: 'id' | 'handle'; value: string } | null> {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    
    // /channel/ID
    if (path.startsWith('/channel/')) {
      const id = path.split('/')[2];
      return id ? { type: 'id', value: id } : null;
    }
    
    // /@handle
    if (path.startsWith('/@')) {
      const handle = path.split('/')[1];
      return handle ? { type: 'handle', value: handle } : null;
    }
    
    // /c/name or /user/name (legacy, might require search API but we'll try handle first)
    if (path.startsWith('/c/') || path.startsWith('/user/')) {
      const name = path.split('/')[2];
      return name ? { type: 'handle', value: name } : null;
    }
    
    return null;
  } catch (_e) {
    // maybe it's just the handle without Full URL
    if (url.startsWith('@')) {
      return { type: 'handle', value: url };
    }
    return null;
  }
}

export async function fetchChannelDetails(url: string): Promise<ChannelInfo> {
  if (!API_KEY) {
    throw new Error('API_KEY mapping missing. Using demo mode?');
  }

  const parsed = await extractChannelHandleOrId(url);
  if (!parsed) throw new Error('Invalid YouTube URL');

  let apiUrl = `${BASE_URL}/channels?part=snippet,statistics&key=${API_KEY}`;
  
  if (parsed.type === 'id') {
    apiUrl += `&id=${parsed.value}`;
  } else if (parsed.type === 'handle') {
    // the API expects handle with @
    const handleValue = parsed.value.startsWith('@') ? parsed.value : `@${parsed.value}`;
    apiUrl += `&forHandle=${handleValue}`;
  }

  const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
  
  if (!res.ok) {
    if (res.status === 403) throw new Error('QUOTA_EXCEEDED');
    throw new Error('Failed to fetch channel');
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const item = data.items[0];
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    customUrl: item.snippet.customUrl,
    publishedAt: item.snippet.publishedAt,
    country: item.snippet.country || '',
    thumbnails: item.snippet.thumbnails,
    statistics: item.statistics,
  };
}

export async function fetchRecentVideos(channelId: string, maxResults: number = 200): Promise<VideoStats[]> {
  if (!API_KEY) {
    throw new Error('API_KEY missing');
  }

  // To get a channel's recent videos, the most efficient way is pulling from their 'uploads' playlist
  // First, we need the uploads playlist ID (which is usually replacing 'UC' with 'UU' in channel ID)
  const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');

  let allPlaylistItems: any[] = [];
  let nextPageToken: string | undefined = undefined;

  // Fetch up to maxResults videos
  while (allPlaylistItems.length < maxResults) {
    const limit = Math.min(50, maxResults - allPlaylistItems.length);
    let playlistUrl = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${limit}&key=${API_KEY}`;
    if (nextPageToken) {
      playlistUrl += `&pageToken=${nextPageToken}`;
    }
    
    const plRes = await fetch(playlistUrl, { next: { revalidate: 3600 } });
    if (!plRes.ok) {
      if (plRes.status === 403) throw new Error('QUOTA_EXCEEDED');
      // If we already have some items, just break and use what we have, otherwise throw
      if (allPlaylistItems.length > 0) break;
      throw new Error('Failed to fetch videos');
    }

    const plData = await plRes.json();
    if (!plData.items || plData.items.length === 0) break;

    allPlaylistItems = allPlaylistItems.concat(plData.items);
    nextPageToken = plData.nextPageToken;

    if (!nextPageToken) break;
  }

  if (allPlaylistItems.length === 0) return [];

  // Chunk video IDs by 50 to fetch stats concurrently
  const videoIds = allPlaylistItems.map(item => item.contentDetails.videoId);
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  let allStats: any[] = [];
  const statPromises = chunks.map(async (chunk) => {
    const statsUrl = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${API_KEY}`;
    const statsRes = await fetch(statsUrl, { next: { revalidate: 3600 } });
    if (!statsRes.ok) {
      if (statsRes.status === 403) throw new Error('QUOTA_EXCEEDED');
      return [];
    }
    const statsData = await statsRes.json();
    return statsData.items || [];
  });

  const statsResults = await Promise.all(statPromises);
  allStats = statsResults.flat();
  
  return allStats.map((item: any) => {
    const views = parseInt(item.statistics.viewCount || '0');
    const likes = parseInt(item.statistics.likeCount || '0');
    const comments = parseInt(item.statistics.commentCount || '0');
    
    // Calculate engagement: (likes + comments) / views
    const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnails: item.snippet.thumbnails,
      viewCount: item.statistics.viewCount || '0',
      likeCount: item.statistics.likeCount || '0',
      commentCount: item.statistics.commentCount || '0',
      engagementRate: engagementRate.toFixed(2),
      duration: item.contentDetails?.duration || '',
      tags: item.snippet.tags || [],
    };
  });
}
