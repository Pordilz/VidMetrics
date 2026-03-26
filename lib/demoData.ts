import { ChannelInfo, VideoStats } from './youtube';

export const demoChannel: ChannelInfo = {
  id: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
  title: 'MrBeast',
  description: 'Accomplish the impossible.',
  customUrl: '@MrBeast',
  publishedAt: '2012-02-20T00:43:50Z',
  thumbnails: {
    default: { url: 'https://yt3.ggpht.com/fxGKYucJAVcjNdStarIGHQJVlNk-yOUjK2oE74toEM_h7EM3jEqg7y-2s6Bv2B6b9tD2wgQ=s88-c-k-c0x00ffffff-no-rj' },
    medium: { url: 'https://yt3.ggpht.com/fxGKYucJAVcjNdStarIGHQJVlNk-yOUjK2oE74toEM_h7EM3jEqg7y-2s6Bv2B6b9tD2wgQ=s240-c-k-c0x00ffffff-no-rj' },
    high: { url: 'https://yt3.ggpht.com/fxGKYucJAVcjNdStarIGHQJVlNk-yOUjK2oE74toEM_h7EM3jEqg7y-2s6Bv2B6b9tD2wgQ=s800-c-k-c0x00ffffff-no-rj' }
  },
  statistics: {
    viewCount: '47829103821',
    subscriberCount: '250000000',
    hiddenSubscriberCount: false,
    videoCount: '790'
  }
};

export const demoVideos: VideoStats[] = [
  {
    id: '0e3GPea1Tyg',
    title: '$456,000 Squid Game In Real Life!',
    description: 'Squid Game in Real Life!',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago to test trending
    thumbnails: {
      medium: { url: 'https://i.ytimg.com/vi/0e3GPea1Tyg/mqdefault.jpg' },
      high: { url: 'https://i.ytimg.com/vi/0e3GPea1Tyg/hqdefault.jpg' }
    },
    viewCount: '596123456',
    likeCount: '15000000',
    commentCount: '600000',
    engagementRate: '2.62'
  },
  {
    id: 'Wctsq1Zp278',
    title: 'Surviving 50 Hours In Antarctica',
    description: 'We flew to Antarctica and survived 50 hours!',
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago testing trending
    thumbnails: {
      medium: { url: 'https://i.ytimg.com/vi/Wctsq1Zp278/mqdefault.jpg' },
      high: { url: 'https://i.ytimg.com/vi/Wctsq1Zp278/hqdefault.jpg' }
    },
    viewCount: '201000000',
    likeCount: '8000000',
    commentCount: '200000',
    engagementRate: '4.08'
  },
  {
    id: 'QjR0uD52X9g',
    title: 'I Spent 50 Hours Buried Alive',
    description: 'This was the most insane thing I\'ve ever done.',
    publishedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnails: {
      medium: { url: 'https://i.ytimg.com/vi/QjR0uD52X9g/mqdefault.jpg' },
      high: { url: 'https://i.ytimg.com/vi/QjR0uD52X9g/hqdefault.jpg' }
    },
    viewCount: '310500000',
    likeCount: '12000000',
    commentCount: '450000',
    engagementRate: '4.01'
  },
  {
    id: 'x9ZkC3OgI78',
    title: 'I Built Willy Wonka\'s Chocolate Factory!',
    description: 'We actually built the chocolate factory...',
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnails: {
      medium: { url: 'https://i.ytimg.com/vi/x9ZkC3OgI78/mqdefault.jpg' },
      high: { url: 'https://i.ytimg.com/vi/x9ZkC3OgI78/hqdefault.jpg' }
    },
    viewCount: '190400000',
    likeCount: '6200000',
    commentCount: '150000',
    engagementRate: '3.33'
  },
  {
    id: 'F5LhYyG82v0',
    title: 'I Cleaned The World\'s Dirtiest Beach #TeamSeas',
    description: 'Help us clean the ocean!',
    publishedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnails: {
      medium: { url: 'https://i.ytimg.com/vi/F5LhYyG82v0/mqdefault.jpg' },
      high: { url: 'https://i.ytimg.com/vi/F5LhYyG82v0/hqdefault.jpg' }
    },
    viewCount: '85000000',
    likeCount: '4300000',
    commentCount: '120000',
    engagementRate: '5.20'
  }
];
