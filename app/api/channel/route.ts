/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { fetchChannelDetails } from '@/lib/youtube';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const data = await fetchChannelDetails(url);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === 'QUOTA_EXCEEDED') {
      return NextResponse.json({ error: 'YouTube API quota exceeded.', quotaExceeded: true }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch channel' }, { status: 500 });
  }
}
