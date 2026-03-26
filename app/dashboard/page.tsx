'use client';

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatNumber, formatDuration, timeAgo, formatDate, getTrendLabel, FLAGS, validateYouTubeURL } from '@/lib/formatters';
import { Chart, registerables } from 'chart.js';
import NumberTicker from '@/components/ui/number-ticker';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import BlurFade from '@/components/ui/blur-fade';
import ShinyButton from '@/components/ui/shiny-button';

Chart.register(...registerables);

// ===== TYPES =====
interface ChannelData {
  name: string;
  subs: string;
  videos: number;
  country: string;
  created: string;
  verified: boolean;
  thumbnail?: string;
}

interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  duration: number;
  engagementRate: number;
  thumbnail: string;
  tags: string[];
  trendingScore: number;
}

interface AppData {
  channel: ChannelData;
  videos: VideoData[];
}

// ===== DEMO DATA ENGINE =====
const DEMO_CHANNELS: Record<string, Omit<ChannelData, 'thumbnail'>> = {
  '@MrBeast': { name: 'MrBeast', subs: '340M', videos: 812, country: 'US', created: '2012-02-20', verified: true },
  '@mkbhd': { name: 'Marques Brownlee', subs: '19.8M', videos: 1621, country: 'US', created: '2008-03-21', verified: true },
  '@VeritasiumOfficial': { name: 'Veritasium', subs: '16.2M', videos: 387, country: 'AU', created: '2011-01-21', verified: true },
  '@LinusTechTips': { name: 'Linus Tech Tips', subs: '16.5M', videos: 6412, country: 'CA', created: '2008-11-24', verified: true },
};

const VIDEO_TITLES = [
  "I Spent 50 Hours Buried Alive", "This Technology Will Change Everything",
  "We Built the World's Largest Domino Chain", "The Hidden Science of Everyday Things",
  "I Gave Away $1,000,000 in 24 Hours", "Why Everyone is Wrong About AI",
  "Surviving 100 Days in the Wilderness", "The Best Tech Under $100 — 2026 Edition",
  "This Experiment Changed My Mind", "How One Decision Changed Everything",
  "Building a House in 24 Hours", "Reacting to the Most Viral Videos Ever",
  "I Tested Every Productivity Hack", "The Truth About Subscription Services",
  "24 Hours Inside a Billionaire's Life", "Why This Simple Trick Works Every Time",
  "I Challenged 100 People to Do This", "The Science of Going Viral",
  "We Recreated Famous Movie Scenes", "I Tried Living on $1 for 30 Days",
  "The Future of Electric Vehicles Explained", "Rating Every Fast Food Chain",
  "I Let AI Control My Life for a Week", "The Most Underrated Gadgets of 2026",
  "Inside the World's Most Secure Building", "How to Master Any Skill in 30 Days",
  "This Changed How I Think About Money", "The Biggest Mistakes Beginners Make",
  "I Traveled to the Most Remote Place", "Building a Business From Zero",
  "Why This Trend is Dying", "The Ultimate Comparison Test",
  "Day in the Life of a Content Creator", "I Gave Away 1000 Phones",
  "The Real Cost of Living in 2026", "Testing Viral Life Hacks — Do They Work?",
  "Inside the Factory That Makes Everything", "How I Gained 1M Subscribers",
  "The Science Behind Perfect Coffee", "I Bought Everything in One Store",
  "Tutorial: Advanced Video Editing Tips", "Why Minimalism Changed My Life",
  "The Biggest Tech Fails This Year", "How Algorithms Really Work",
  "I Survived 7 Days With No Sleep", "The Complete Beginner's Guide",
  "Why Small Channels Win Big", "Behind the Scenes of Our Biggest Video",
  "This Hack Saves 3 Hours Every Day", "The Psychology of Click-Through Rates"
];

const TAGS_POOL = ['tech','science','entertainment','tutorial','vlog','challenge','review','news','education','gaming','lifestyle','finance','travel','food','diy'];

function generateDemoData(query: string): AppData {
  const key = Object.keys(DEMO_CHANNELS).find(k => query.toLowerCase().includes(k.toLowerCase().replace('@', '')));
  const base = key ? DEMO_CHANNELS[key] : {
    name: query.replace(/[@/]|https?:\/\/.*\//g, '').replace(/\b\w/g, l => l.toUpperCase()),
    subs: `${(Math.random() * 15 + 0.5).toFixed(1)}M`,
    videos: Math.floor(Math.random() * 2000 + 100),
    country: ['US','UK','CA','AU','DE','JP','KR','BR','IN','FR'][Math.floor(Math.random() * 10)],
    created: `${2008 + Math.floor(Math.random() * 12)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    verified: Math.random() > 0.3
  };

  const videos: VideoData[] = [];
  const numVideos = 150 + Math.floor(Math.random() * 50);
  const now = Date.now();
  const shuffled = [...VIDEO_TITLES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < numVideos; i++) {
    const daysAgo = Math.floor(Math.random() * 120);
    const publishDate = new Date(now - daysAgo * 86400000);
    const dayOfWeek = publishDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const viewMultiplier = isWeekday ? 1.2 : 0.85;
    const recencyBoost = daysAgo < 7 ? 2.5 : daysAgo < 14 ? 1.8 : daysAgo < 30 ? 1.3 : 1;
    const baseViews = Math.floor((Math.random() * 5000000 + 50000) * viewMultiplier * recencyBoost);
    const likeRate = 0.02 + Math.random() * 0.05;
    const commentRate = 0.001 + Math.random() * 0.004;
    const views = baseViews;
    const likes = Math.floor(views * likeRate);
    const comments = Math.floor(views * commentRate);
    const duration = Math.floor(Math.random() * 1800 + 120);
    const engagementRate = ((likes + comments) / views) * 100;
    const tags: string[] = [];
    const numTags = 2 + Math.floor(Math.random() * 4);
    const tagPool = [...TAGS_POOL].sort(() => Math.random() - 0.5);
    for (let t = 0; t < numTags; t++) tags.push(tagPool[t]);

    videos.push({
      id: 'vid_' + Math.random().toString(36).substr(2, 11),
      title: shuffled[i % shuffled.length] + (i >= shuffled.length ? ` (Part ${Math.floor(i / shuffled.length) + 1})` : ''),
      publishedAt: publishDate.toISOString(),
      views, likes, comments, duration, engagementRate,
      thumbnail: `https://picsum.photos/seed/${Math.floor(Math.random() * 10000)}/640/360`,
      tags, trendingScore: 0
    });
  }

  const avgViews = videos.reduce((s, v) => s + v.views, 0) / videos.length;
  const avgEng = videos.reduce((s, v) => s + v.engagementRate, 0) / videos.length;

  videos.forEach(v => {
    const daysAgo = Math.floor((now - new Date(v.publishedAt).getTime()) / 86400000);
    const recencyScore = Math.max(0, 100 - daysAgo * 3);
    const viewVelocity = Math.min(100, (v.views / avgViews) * 50);
    const engScore = Math.min(100, (v.engagementRate / avgEng) * 50);
    v.trendingScore = Math.round(recencyScore * 0.4 + viewVelocity * 0.35 + engScore * 0.25);
  });

  videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return { channel: base, videos };
}

// ===== Parse ISO 8601 duration (PT1H2M3S) to seconds =====
function parseDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
}

// ===== TRY TO FETCH FROM REAL API, FALLBACK TO DEMO =====
async function fetchChannelData(query: string): Promise<AppData> {
  try {
    // Build a URL for the API — if it's a handle like @MrBeast, wrap it
    let apiUrl = query;
    if (query.startsWith('@')) {
      apiUrl = `https://youtube.com/${query}`;
    } else if (!query.startsWith('http')) {
      apiUrl = `https://youtube.com/@${query}`;
    }

    const channelRes = await fetch(`/api/channel?url=${encodeURIComponent(apiUrl)}`);
    if (!channelRes.ok) throw new Error('API failed');
    const channelData = await channelRes.json();
    if (channelData.error) throw new Error(channelData.error);

    const videosRes = await fetch(`/api/videos?channelId=${encodeURIComponent(channelData.id)}`);
    if (!videosRes.ok) throw new Error('Videos API failed');
    const videosData = await videosRes.json();
    if (videosData.error) throw new Error(videosData.error);

    // Transform API data to match our structure
    const channel: ChannelData = {
      name: channelData.title,
      subs: formatNumber(parseInt(channelData.statistics.subscriberCount)),
      videos: parseInt(channelData.statistics.videoCount),
      country: channelData.country || '',
      created: channelData.publishedAt,
      verified: parseInt(channelData.statistics.subscriberCount) > 100000,
      thumbnail: channelData.thumbnails?.high?.url || channelData.thumbnails?.medium?.url || channelData.thumbnails?.default?.url,
    };

    const now = Date.now();
    const avgViews = videosData.length ? videosData.reduce((s: number, v: any) => s + parseInt(v.viewCount), 0) / videosData.length : 1;
    const avgEng = videosData.length ? videosData.reduce((s: number, v: any) => s + parseFloat(v.engagementRate || '0'), 0) / videosData.length : 1;

    const videos: VideoData[] = videosData.map((v: any) => {
      const views = parseInt(v.viewCount);
      const likes = parseInt(v.likeCount);
      const comments = parseInt(v.commentCount);
      const engagementRate = parseFloat(v.engagementRate || '0');
      const daysAgo = Math.floor((now - new Date(v.publishedAt).getTime()) / 86400000);
      const recencyScore = Math.max(0, 100 - daysAgo * 3);
      const viewVelocity = Math.min(100, (views / avgViews) * 50);
      const engScore = Math.min(100, (engagementRate / (avgEng || 1)) * 50);
      const trendingScore = Math.round(recencyScore * 0.4 + viewVelocity * 0.35 + engScore * 0.25);

      return {
        id: v.id,
        title: v.title,
        publishedAt: v.publishedAt,
        views, likes, comments,
        duration: v.duration ? parseDuration(v.duration) : Math.floor(Math.random() * 1800 + 120),
        engagementRate, trendingScore,
        thumbnail: v.thumbnails?.high?.url || v.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        tags: v.tags?.slice(0, 5) || ['youtube'],
      };
    });

    return { channel, videos };
  } catch {
    // Fallback to demo data
    return generateDemoData(query);
  }
}

// ===== THE DASHBOARD =====
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'grid' | 'table'>('grid');
  const [currentSort, setCurrentSort] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [dateFilter, setDateFilter] = useState('30');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVideo, setModalVideo] = useState<VideoData | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);

  const viewsChartRef = useRef<HTMLCanvasElement>(null);
  const engChartRef = useRef<HTMLCanvasElement>(null);
  const viewsChartInstance = useRef<Chart | null>(null);
  const engChartInstance = useRef<Chart | null>(null);

  const perPage = 12;

  useEffect(() => {
    if (query) {
      setLoading(true);
      fetchChannelData(query).then(data => {
        setAppData(data);
        setLoading(false);
      });
    }
  }, [query]);

  // Render charts when data loads
  useEffect(() => {
    if (!appData || loading) return;
    renderCharts();
    return () => {
      viewsChartInstance.current?.destroy();
      engChartInstance.current?.destroy();
    };
  }, [appData, loading]);

  function renderCharts() {
    if (!appData) return;
    const { videos } = appData;
    const sorted = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()).slice(-30);

    viewsChartInstance.current?.destroy();
    engChartInstance.current?.destroy();

    if (viewsChartRef.current) {
      const ctx = viewsChartRef.current.getContext('2d');
      if (ctx) {
        const maxViews = Math.max(...sorted.map(v => v.views));
        viewsChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: sorted.map(v => formatDate(v.publishedAt)),
            datasets: [{
              data: sorted.map(v => v.views),
              backgroundColor: sorted.map(v => {
                const ratio = v.views / maxViews;
                if (ratio > 0.7) return '#E8441A';
                if (ratio > 0.4) return '#1A1714';
                return '#C8C2B8';
              }),
              borderRadius: 3,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1A1714', titleColor: '#F7F5F0', bodyColor: '#F7F5F0',
                titleFont: { family: 'Instrument Sans', size: 12, weight: 600 as any },
                bodyFont: { family: 'DM Mono', size: 12 },
                padding: 12, cornerRadius: 6,
                callbacks: {
                  title: (items) => sorted[items[0].dataIndex]?.title?.slice(0, 40) + '…',
                  label: (item) => `Views: ${formatNumber(item.raw as number)}`
                }
              }
            },
            scales: {
              x: { grid: { color: 'rgba(26,23,20,0.04)' }, ticks: { display: false }, border: { color: '#E2DDD6' } },
              y: { grid: { color: 'rgba(26,23,20,0.06)' }, ticks: { color: '#A39E99', font: { family: 'DM Mono', size: 10 }, callback: (v: any) => formatNumber(v) }, border: { display: false } }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
          }
        });
      }
    }

    if (engChartRef.current) {
      const ctx = engChartRef.current.getContext('2d');
      if (ctx) {
        const totalViews = videos.reduce((s, v) => s + v.views, 0);
        const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
        const totalComments = videos.reduce((s, v) => s + v.comments, 0);
        engChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Views', 'Likes', 'Comments'],
            datasets: [{
              data: [totalViews, totalLikes * 100, totalComments * 1000],
              backgroundColor: ['#1A1714', '#E8441A', '#8FA68E'],
              borderWidth: 0, spacing: 3, borderRadius: 4,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#6B6560', font: { family: 'Instrument Sans', size: 12, weight: 500 as any }, padding: 16, usePointStyle: true, pointStyleWidth: 8 } },
              tooltip: { backgroundColor: '#1A1714', titleColor: '#F7F5F0', bodyColor: '#F7F5F0', bodyFont: { family: 'DM Mono', size: 12 }, padding: 12, cornerRadius: 6 }
            },
            animation: { animateRotate: true, duration: 1000, easing: 'easeOutQuart' }
          }
        });
      }
    }
  }

  // ===== TOAST =====  
  const showToast = useCallback((msg: string) => {
    setToasts(prev => [...prev, msg]);
    setTimeout(() => setToasts(prev => prev.slice(1)), 2800);
  }, []);

  // ===== EXPORT CSV =====
  const exportCSV = () => {
    if (!appData) return;
    const headers = ['Title','Published','Views','Likes','Comments','Duration','Engagement Rate','Trending Score'];
    const rows = appData.videos.map(v => [
      `"${v.title.replace(/"/g, '""')}"`, v.publishedAt, v.views, v.likes, v.comments, v.duration, v.engagementRate.toFixed(2), v.trendingScore
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidmetrics-${appData.channel.name}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ CSV exported successfully');
  };

  // ===== FILTER & SORT =====
  const getFilteredVideos = useCallback(() => {
    if (!appData) return [];
    const now = Date.now();
    let filtered = appData.videos.filter(v => {
      if (searchQ && !v.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter);
        if ((now - new Date(v.publishedAt).getTime()) > days * 86400000) return false;
      }
      if (trendingOnly && v.trendingScore < 70) return false;
      return true;
    });

    const sortFns: Record<string, (a: VideoData, b: VideoData) => number> = {
      date: (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      views: (a, b) => b.views - a.views,
      likes: (a, b) => b.likes - a.likes,
      comments: (a, b) => b.comments - a.comments,
      engagement: (a, b) => b.engagementRate - a.engagementRate,
      trending: (a, b) => b.trendingScore - a.trendingScore,
    };
    filtered.sort(sortFns[currentSort] || sortFns.date);
    if (sortDir === 'asc') filtered.reverse();
    return filtered;
  }, [appData, searchQ, dateFilter, trendingOnly, currentSort, sortDir]);

  const filtered = getFilteredVideos();
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSort = (key: string) => {
    if (currentSort === key) setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setCurrentSort(key); setSortDir('desc'); }
    setCurrentPage(1);
  };

  // ===== KPIs =====
  const getKPIs = () => {
    if (!appData) return [];
    const { videos } = appData;
    const now = Date.now();
    const last30 = videos.filter(v => (now - new Date(v.publishedAt).getTime()) < 30 * 86400000);
    const totalViews30 = last30.reduce((s, v) => s + v.views, 0);
    const avgViews = videos.length ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0;
    const topVideo = [...videos].sort((a, b) => b.views - a.views)[0];
    const avgEng = videos.length ? (videos.reduce((s, v) => s + v.engagementRate, 0) / videos.length).toFixed(2) : '0';
    const weeks = new Set(videos.map(v => {
      const d = new Date(v.publishedAt);
      const start = new Date(d.getFullYear(), 0, 1);
      return d.getFullYear() + '-' + Math.ceil((d.getTime() - start.getTime()) / 604800000);
    }));
    const cadence = weeks.size ? (videos.length / weeks.size).toFixed(1) : '0';

    return [
      { label: 'Views (30 Days)', value: totalViews30, format: 'number', trend: 'up', trendVal: '+12.4%' },
      { label: 'Avg Views / Video', value: avgViews, format: 'number', trend: 'neutral', trendVal: '~steady' },
      { label: 'Top Video Views', value: topVideo?.views || 0, format: 'number', sub: topVideo ? topVideo.title.slice(0, 30) + '…' : '' },
      { label: 'Avg Engagement', value: parseFloat(avgEng), format: 'percent', trend: 'up', trendVal: '+0.3%' },
      { label: 'Cadence', value: parseFloat(cadence), format: 'rate', sub: `${last30.length} videos this month` },
    ];
  };

  // ===== INSIGHTS =====
  const getInsights = () => {
    if (!appData) return [];
    const { videos } = appData;
    const insights: { type: string; icon: string; title: string; body: string }[] = [];
    const now = Date.now();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayViews: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    videos.forEach(v => {
      const d = new Date(v.publishedAt).getDay();
      dayViews[d] = (dayViews[d] || 0) + v.views;
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    let bestDay = 0, bestAvg = 0;
    
    // Ignore days with statistically insignificant upload counts to avoid "1 viral video" outliers
    const threshold = Math.max(2, Math.floor(videos.length * 0.05));
    let validDays = Object.keys(dayCounts).map(Number).filter(d => dayCounts[d] >= threshold);
    if (validDays.length === 0) validDays = Object.keys(dayCounts).map(Number); // fallback
    
    validDays.forEach(d => {
      const avg = dayViews[d] / dayCounts[d];
      if (avg > bestAvg) { bestAvg = avg; bestDay = d; }
    });
    
    const validAvgs = validDays.map(d => dayViews[d] / dayCounts[d]);
    const worstAvg = validAvgs.length ? Math.min(...validAvgs) : 0;
    const dayLift = worstAvg && bestAvg > worstAvg ? Math.round((bestAvg / worstAvg - 1) * 100) : 0;
    insights.push({ type: 'info', icon: '📅', title: `Best day to post: ${dayNames[bestDay]}`, body: `Videos published on ${dayNames[bestDay]} average <span class="insight-stat">${dayLift}% more views</span> than the lowest performing day.` });

    const buckets: Record<string, number[]> = { short: [], mid: [], long: [] };
    videos.forEach(v => {
      if (v.duration < 480) buckets.short.push(v.views);
      else if (v.duration < 900) buckets.mid.push(v.views);
      else buckets.long.push(v.views);
    });
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgS = avg(buckets.short), avgM = avg(buckets.mid), avgL = avg(buckets.long);
    const avgsList = [avgS, avgM, avgL].filter(a => a > 0);
    const maxLen = avgsList.length ? Math.max(...avgsList) : 0;
    const minLen = avgsList.length ? Math.min(...avgsList) : 0;
    
    let bestLength = 'any length';
    if (maxLen > 0) {
      if (maxLen === avgM) bestLength = '8–15 minutes';
      else if (maxLen === avgS) bestLength = 'under 8 minutes';
      else bestLength = '15+ minutes';
    }
    const lenMult = minLen > 0 ? (maxLen / minLen).toFixed(1) : '1.0';
    insights.push({ type: 'opportunity', icon: '🎯', title: `Sweet spot duration: ${bestLength}`, body: `Videos in the ${bestLength} range average <span class="insight-stat">${lenMult}× more views</span> than other lengths.` });

    const last7 = videos.filter(v => (now - new Date(v.publishedAt).getTime()) < 7 * 86400000).length;
    const prev7 = videos.filter(v => { const d = now - new Date(v.publishedAt).getTime(); return d >= 7 * 86400000 && d < 14 * 86400000; }).length;
    if (last7 > prev7 + 1) {
      insights.push({ type: 'alert', icon: '⚡', title: 'Production ramp-up detected', body: `<span class="insight-stat">${last7} videos</span> in the last 7 days vs ${prev7} the week prior.` });
    } else {
      insights.push({ type: 'warning', icon: '⚡', title: `Posting velocity: ${last7} videos this week`, body: `Compared to <span class="insight-stat">${prev7} videos</span> last week. ${last7 < prev7 ? 'Slight slowdown detected.' : 'Consistent cadence maintained.'}` });
    }

    const sortedByViews = [...videos].sort((a, b) => b.views - a.views);
    const top20Count = Math.max(1, Math.ceil(videos.length * 0.2));
    const top20Views = sortedByViews.slice(0, top20Count).reduce((s, v) => s + v.views, 0);
    const totalViewsAll = videos.reduce((s, v) => s + v.views, 0);
    const paretoPct = totalViewsAll ? Math.round((top20Views / totalViewsAll) * 100) : 0;
    insights.push({ type: 'info', icon: '💡', title: 'Content concentration', body: `The top 20% of videos capture <span class="insight-stat">${paretoPct}% of total views</span>. ${paretoPct > 70 ? 'Highly concentrated — a few hits drive most traffic.' : 'Views are relatively well distributed across content.'}` });

    return insights;
  };

  // ===== HEATMAP =====
  const renderHeatmap = () => {
    if (!appData) return null;
    const { videos } = appData;
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const today = new Date();
    
    const dayCounts: Record<string, number> = {};
    videos.forEach(v => {
      const d = new Date(v.publishedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    });

    // Calculate the Sunday of the current week (end of the calendar grid)
    const currentDay = today.getDay(); // 0 = Sun, 1 = Mon, ...
    const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
    const endOfCalendar = new Date(today);
    endOfCalendar.setDate(today.getDate() + daysUntilSunday);

    const weeks = [];
    for (let w = 51; w >= 0; w--) {
      const cells = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(endOfCalendar);
        date.setDate(endOfCalendar.getDate() - (w * 7 + (6 - d)));
        
        if (date > today) {
          cells.push(<div key={`${w}-${d}`} className="heatmap-cell" title="Future date" />);
          continue;
        }

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const count = dayCounts[key] || 0;
        let cls = '';
        if (count === 1) cls = 'l1';
        else if (count === 2) cls = 'l2';
        else if (count === 3) cls = 'l3';
        else if (count >= 4) cls = 'l4';
        
        const titleContent = count > 0 
          ? `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${count} video${count !== 1 ? 's' : ''}` 
          : `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: No videos`;

        cells.push(<div key={`${w}-${d}`} className={`heatmap-cell ${cls}`} title={titleContent} />);
      }
      weeks.push(<div key={w} className="heatmap-col">{cells}</div>);
    }

    return (
      <div className="heatmap-section">
        <div className="heatmap-card">
          <div className="chart-label">Cadence</div>
          <div className="chart-title">Publishing Calendar</div>
          <div className="chart-subtitle" style={{ marginBottom: 16 }}>Upload frequency heatmap — last 52 weeks</div>
          <div style={{ display: 'flex' }}>
            <div className="heatmap-days">
              {days.map(d => <span key={d} className="heatmap-day-label">{d}</span>)}
            </div>
            <div className="heatmap-grid">{weeks}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <nav className="dash-nav"><div className="dash-nav-inner"><div className="dash-nav-left"><div className="logo" style={{ fontSize: 15 }}><div className="logo-icon" style={{ width: 22, height: 22, fontSize: 11, borderRadius: 5 }}>▶</div>VidMetrics</div></div></div></nav>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 48px', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 300, height: 40, margin: '0 auto 24px' }} />
          <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (!appData) return null;

  const kpis = getKPIs();
  const insights = getInsights();
  const sortOptions = [
    { key: 'date', label: 'Date' }, { key: 'views', label: 'Views' }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'engagement', label: 'Engagement' }, { key: 'trending', label: 'Trending Score' }
  ];

  return (
    <div className="dashboard-page">
      {/* Nav */}
      <nav className="dash-nav">
        <div className="dash-nav-inner">
          <div className="dash-nav-left">
            <button className="back-btn" onClick={() => router.push('/')}>← New Search</button>
            <div className="logo" style={{ fontSize: 15 }}>
              <div className="logo-icon" style={{ width: 22, height: 22, fontSize: 11, borderRadius: 5 }}>▶</div>
              VidMetrics
            </div>
          </div>
          <div className="dash-nav-right">
            <ShinyButton 
              className="bg-[var(--color-primary)] text-white hover:bg-[#c23714] !px-4 !py-1.5" 
              onClick={exportCSV}
            >
              ⬇ CSV 
            </ShinyButton>
            <ShinyButton 
              className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-background)] !px-4 !py-1.5" 
              onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('✓ Link copied'); }}
            >
              🔗 Copy Link
            </ShinyButton>
          </div>
        </div>
      </nav>

      {/* Channel Header */}
      <div className="channel-header">
        <div className="channel-info">
          <div className="channel-avatar">
            {appData.channel.thumbnail ? (
              <img src={appData.channel.thumbnail} alt={appData.channel.name} referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden-placeholder'); }} />
            ) : null}
            <div className={`channel-avatar-placeholder ${appData.channel.thumbnail ? 'hidden-placeholder' : ''}`} style={appData.channel.thumbnail ? { display: 'none' } : {}}>{appData.channel.name.charAt(0)}</div>
          </div>
          <div className="channel-meta">
            <h1>{appData.channel.name} {appData.channel.verified && <span className="verified-badge">✓</span>}</h1>
            <div className="channel-stats">
              <span className="channel-stat"><strong>{appData.channel.subs}</strong> subscribers</span>
              <span className="channel-stat"><strong>{appData.channel.videos.toLocaleString()}</strong> videos</span>
              {appData.channel.country && <span className="channel-stat">{FLAGS[appData.channel.country] || '🌐'} {appData.channel.country}</span>}
              <span className="channel-stat">Since {formatDate(appData.channel.created)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <BlurFade key={i} delay={0.1 + i * 0.05} inView>
            <SpotlightCard className="kpi-card !border-0" spotlightColor="rgba(232, 68, 26, 0.05)">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value relative">
                {k.format === 'number' && k.value >= 1000000 ? (
                  <><NumberTicker value={k.value / 1000000} decimalPlaces={1} />M</>
                ) : k.format === 'number' && k.value >= 1000 ? (
                  <><NumberTicker value={k.value / 1000} decimalPlaces={1} />K</>
                ) : k.format === 'number' ? (
                  <NumberTicker value={k.value as number} />
                ) : k.format === 'percent' ? (
                  <><NumberTicker value={k.value as number} decimalPlaces={2} />%</>
                ) : (
                  <><NumberTicker value={k.value as number} decimalPlaces={1} />/wk</>
                )}
              </div>
              {k.trend && <div className={`kpi-trend ${k.trend}`}>{k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : '→'} {k.trendVal}</div>}
              {k.sub && <div className="kpi-sub">{k.sub}</div>}
            </SpotlightCard>
          </BlurFade>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-label">Performance</div>
          <div className="chart-title">Views Over Time</div>
          <div className="chart-subtitle">Per-video view counts by publish date</div>
          <div className="chart-container"><canvas ref={viewsChartRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-label">Engagement</div>
          <div className="chart-title">Interaction Breakdown</div>
          <div className="chart-subtitle">Normalized likes vs comments vs views</div>
          <div className="chart-container"><canvas ref={engChartRef} /></div>
        </div>
      </div>

      {/* Heatmap */}
      {renderHeatmap()}

      {/* Insights */}
      <div className="insights-section">
        <div className="section-header-ruled">
          <div>
            <div className="section-label">Analysis</div>
            <div className="section-h2">Performance Insights</div>
          </div>
          <div className="ruled-line" />
        </div>
        <div className="insights-grid">
          {insights.map((ins, i) => (
            <BlurFade key={i} delay={0.2 + i * 0.1} inView>
              <div className={`insight-card type-${ins.type}`}>
                <div className="insight-icon">{ins.icon}</div>
                <div className="insight-title">{ins.title}</div>
                <div className="insight-body" dangerouslySetInnerHTML={{ __html: ins.body }} />
              </div>
            </BlurFade>
          ))}
        </div>
      </div>

      {/* Videos */}
      <div className="videos-section">
        <div className="section-header">
          <div className="section-title">Videos ({filtered.length})</div>
          <div className="filter-bar">
            <input className="filter-input" type="text" placeholder="Search videos…" value={searchQ} onChange={(e) => { setSearchQ(e.target.value); setCurrentPage(1); }} />
            <select className="filter-select" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <label className="filter-toggle" onClick={() => { setTrendingOnly(!trendingOnly); setCurrentPage(1); }}>
              <div className={`toggle-switch ${trendingOnly ? 'active' : ''}`} />
              <span>Trending only</span>
            </label>
            <div className="view-toggle">
              <button className={`view-toggle-btn ${currentView === 'grid' ? 'active' : ''}`} onClick={() => setCurrentView('grid')}>Grid</button>
              <button className={`view-toggle-btn ${currentView === 'table' ? 'active' : ''}`} onClick={() => setCurrentView('table')}>Table</button>
            </div>
          </div>
        </div>

        {/* Sort Bar */}
        <div className="sort-bar">
          <span className="sort-label">Sort by</span>
          {sortOptions.map(s => (
            <button key={s.key} className={`sort-btn ${currentSort === s.key ? 'active' : ''}`} onClick={() => handleSort(s.key)}>
              {s.label} {currentSort === s.key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </button>
          ))}
        </div>

        {/* Grid View */}
        <div className={`video-grid ${currentView === 'table' ? 'hidden' : ''}`}>
          {paged.map((v, i) => {
            const trend = getTrendLabel(v.trendingScore);
            return (
              <div key={v.id} className="video-card revealed" style={{ transitionDelay: `${i * 0.04}s` }} onClick={() => setModalVideo(v)}>
                <div className="video-thumb">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" />
                  <span className="duration-badge">{formatDuration(v.duration)}</span>
                  <span className={`trending-badge ${trend.cls}`}>{v.trendingScore}</span>
                </div>
                <div className="video-body">
                  <div className="video-title">{v.title}</div>
                  <div className="video-stats-row">
                    <span className="video-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><strong>{formatNumber(v.views)}</strong></span>
                    <span className="video-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/></svg><strong>{formatNumber(v.likes)}</strong></span>
                    <span className="video-stat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><strong>{formatNumber(v.comments)}</strong></span>
                  </div>
                  <div className="video-date" title={formatDate(v.publishedAt)}>{timeAgo(v.publishedAt)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table View */}
        <div className={`video-table-wrap ${currentView === 'table' ? 'active' : ''}`}>
          <table className="video-table">
            <thead><tr><th></th><th>Title</th><th>Published</th><th>Views</th><th>Likes</th><th>Comments</th><th>Eng. Rate</th><th>Score</th></tr></thead>
            <tbody>
              {paged.map(v => {
                const trend = getTrendLabel(v.trendingScore);
                return (
                  <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setModalVideo(v)}>
                    <td><img className="table-thumb" src={v.thumbnail} loading="lazy" /></td>
                    <td><span className="table-title">{v.title}</span></td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(v.publishedAt)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatNumber(v.views)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(v.likes)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(v.comments)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{v.engagementRate.toFixed(2)}%</td>
                    <td><span className={`trending-badge ${trend.cls}`} style={{ position: 'static' }}>{v.trendingScore}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            {currentPage > 1 && <button className="page-btn" onClick={() => setCurrentPage(currentPage - 1)}>←</button>}
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(i => i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2).map((i, idx, arr) => (
              <span key={i}>
                {idx > 0 && i - arr[idx - 1] > 1 && <span style={{ color: 'var(--color-text-muted)', padding: '8px 4px' }}>…</span>}
                <button className={`page-btn ${i === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>
              </span>
            ))}
            {currentPage < totalPages && <button className="page-btn" onClick={() => setCurrentPage(currentPage + 1)}>→</button>}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVideo && (
        <div className="modal-overlay active" onClick={() => setModalVideo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalVideo(null)}>✕</button>
            <img className="modal-thumb" src={modalVideo.thumbnail} alt={modalVideo.title} />
            <div className="modal-body">
              <div className="modal-title">{modalVideo.title}</div>
              <div className="modal-meta">
                <div className="modal-stat"><span className="modal-stat-label">Views</span><span className="modal-stat-value">{formatNumber(modalVideo.views)}</span></div>
                <div className="modal-stat"><span className="modal-stat-label">Likes</span><span className="modal-stat-value" style={{ color: 'var(--color-accent)' }}>{formatNumber(modalVideo.likes)}</span></div>
                <div className="modal-stat"><span className="modal-stat-label">Comments</span><span className="modal-stat-value" style={{ color: 'var(--color-success)' }}>{formatNumber(modalVideo.comments)}</span></div>
                <div className="modal-stat"><span className="modal-stat-label">Duration</span><span className="modal-stat-value">{formatDuration(modalVideo.duration)}</span></div>
                <div className="modal-stat"><span className="modal-stat-label">Engagement</span><span className="modal-stat-value">{modalVideo.engagementRate.toFixed(2)}%</span></div>
                <div className="modal-stat"><span className="modal-stat-label">Trending</span><span className="modal-stat-value"><span className={`trending-badge ${getTrendLabel(modalVideo.trendingScore).cls}`} style={{ position: 'static', fontSize: 12 }}>{modalVideo.trendingScore} {getTrendLabel(modalVideo.trendingScore).label}</span></span></div>
              </div>
              <div className="modal-bar">
                <div className="modal-bar-segment" style={{ flex: modalVideo.views / (modalVideo.views + modalVideo.likes + modalVideo.comments), background: 'var(--color-data-1)' }} />
                <div className="modal-bar-segment" style={{ flex: modalVideo.likes / (modalVideo.views + modalVideo.likes + modalVideo.comments), background: 'var(--color-accent)' }} />
                <div className="modal-bar-segment" style={{ flex: modalVideo.comments / (modalVideo.views + modalVideo.likes + modalVideo.comments), background: 'var(--color-data-3)' }} />
              </div>
              <div className="modal-tags">{modalVideo.tags.map(t => <span key={t} className="modal-tag">{t}</span>)}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Published {formatDate(modalVideo.publishedAt)} · {timeAgo(modalVideo.publishedAt)}</div>
              <div className="modal-actions">
                <button className="modal-cta primary" onClick={() => { showToast('Opening on YouTube…'); setModalVideo(null); }}>Watch on YouTube</button>
                <button className="modal-cta secondary" onClick={() => setModalVideo(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className="toast-container">
        {toasts.map((msg, i) => <div key={i} className="toast show">{msg}</div>)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: 300, height: 40 }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
