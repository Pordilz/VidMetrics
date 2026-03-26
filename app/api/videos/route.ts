/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { fetchRecentVideos } from '@/lib/youtube';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'channelId parameter is required' }, { status: 400 });
  }

  try {
    const data = await fetchRecentVideos(channelId);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === 'QUOTA_EXCEEDED') {
      return NextResponse.json({ error: 'YouTube API quota exceeded.', quotaExceeded: true }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch videos' }, { status: 500 });
  }
}
