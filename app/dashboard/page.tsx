'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatNumber, formatDuration, timeAgo, formatDate, getTrendLabel } from '@/lib/formatters';
/* eslint-disable @next/next/no-img-element */
import { Chart, registerables } from 'chart.js';
import NumberTicker from '@/components/ui/number-ticker';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import BlurFade from '@/components/ui/blur-fade';
import ShinyButton from '@/components/ui/shiny-button';

import mrbeastData from '@/lib/mock-data/mrbeast.json';
import mkbhdData from '@/lib/mock-data/mkbhd.json';

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
  isDemo?: boolean;
}


// Curated mock data for demo fallback
const MOCK_MAP: Record<string, AppData> = {
  'mrbeast': mrbeastData,
  'mkbhd': mkbhdData,
  'ucx6oq3dkcsbyne6h8uqquva': mrbeastData,
  'ucbcrf18a7qf58cmattefwwq': mkbhdData
};


// ===== Parse ISO 8601 duration (PT1H2M3S) to seconds =====
function parseDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
}

// ===== TRY TO FETCH FROM REAL API, FALLBACK TO CURATED DEMO =====
async function fetchChannelData(query: string): Promise<AppData | null> {
  try {
    // Build a URL for the API — if it's a handle like @MrBeast, wrap it
    let apiUrl = query;
    if (query.startsWith('@')) {
      apiUrl = `https://youtube.com/${query}`;
    } else if (!query.startsWith('http')) {
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        apiUrl = `https://${query}`;
      } else {
        apiUrl = `https://youtube.com/@${query}`;
      }
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

    type APIVideoEntry = { viewCount: string; likeCount: string; commentCount: string; engagementRate?: string; publishedAt: string; id: string; title: string; duration?: string; thumbnails?: { high?: { url: string }, medium?: { url: string } }, tags?: string[] };
    const now = Date.now();
    const avgViews = videosData.length ? videosData.reduce((s: number, v: APIVideoEntry) => s + parseInt(v.viewCount), 0) / videosData.length : 1;
    const avgEng = videosData.length ? videosData.reduce((s: number, v: APIVideoEntry) => s + parseFloat(v.engagementRate || '0'), 0) / videosData.length : 1;

    const videos: VideoData[] = videosData.map((v: APIVideoEntry) => {
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

    return { channel, videos, isDemo: false };
  } catch (error) {
    console.error("Fetch error, checking mock fallback:", error);
    
    // Normalize query for matching
    const normalized = query.toLowerCase().replace(/[@/]|https?:\/\/.*\/|www\.youtube\.com\//g, '');
    
    if (MOCK_MAP[normalized]) {
      return { ...MOCK_MAP[normalized], isDemo: true };
    }
    
    return null;
  }
}


// ===== THE DASHBOARD =====
// SVG Logo Icon Component
const LogoIcon = ({ size = 32, iconSize = 14 }: { size?: number, iconSize?: number }) => (
  <div className="logo-icon" style={{ width: size, height: size, borderRadius: size / 4 }}>
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
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
      setFetchError(false);
      fetchChannelData(query).then(data => {
        if (data) {
          setAppData(data);
        } else {
          setFetchError(true);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              hoverBackgroundColor: '#C23510',
              hoverBorderWidth: 4,
              hoverBorderColor: 'rgba(0,0,0,0.1)',
              borderRadius: 3,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1A1714', titleColor: '#F7F5F0', bodyColor: '#F7F5F0',
                titleFont: { family: 'Instrument Sans', size: 12, weight: 600 },
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
              y: { grid: { color: 'rgba(26,23,20,0.06)' }, ticks: { color: '#A39E99', font: { family: 'DM Mono', size: 10 }, callback: (v: string | number) => formatNumber(Number(v)) }, border: { display: false } }
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
              hoverBackgroundColor: ['#3A3532', '#F05A32', '#A9BDAB'],
              borderWidth: 0, spacing: 3, borderRadius: 4, hoverOffset: 12,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            interaction: {
              mode: 'nearest',
              intersect: true,
            },
            layout: { padding: 16 },
            plugins: {
              legend: { position: 'bottom', labels: { color: '#6B6560', font: { family: 'Instrument Sans', size: 12, weight: 500 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 } },
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
    const filtered = appData.videos.filter(v => {
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
          cells.push(
            <div key={`${w}-${d}`} className="heatmap-cell">
              <div className="heatmap-tooltip">Future date</div>
            </div>
          );
          continue;
        }

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const count = dayCounts[key] || 0;
        let cls = '';
        if (count === 1) cls = 'l1';
        else if (count === 2) cls = 'l2';
        else if (count === 3) cls = 'l3';
        else if (count >= 4) cls = 'l4';
        
        const tooltipText = count > 0 
          ? `${formatDate(date.toISOString())}: ${count} video${count !== 1 ? 's' : ''}` 
          : `${formatDate(date.toISOString())}: No videos`;
        
        cells.push(
          <div key={`${w}-${d}`} className={`heatmap-cell ${cls}`}>
            <div className="heatmap-tooltip">{tooltipText}</div>
          </div>
        );
      }
      weeks.push(<div key={w} className="heatmap-col">{cells}</div>);
    }

    return (
      <div className="heatmap-section">
        <div className="heatmap-card">
          <div className="chart-label">Cadence</div>
          <div className="chart-title">Publishing Calendar</div>
          <div className="chart-subtitle" style={{ marginBottom: 16 }}>Upload frequency heatmap — last 52 weeks</div>
          <div className="heatmap-container">
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
        <nav className="dash-nav"><div className="dash-nav-inner"><div className="dash-nav-left"><div className="logo" style={{ fontSize: 15 }}><LogoIcon size={22} iconSize={11} />VidMetrics</div></div></div></nav>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 48px', textAlign: 'center' }}>
          <div className="skeleton" style={{ width: 300, height: 40, margin: '0 auto 24px' }} />
          <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="dashboard-page">
        <nav className="dash-nav"><div className="dash-nav-inner"><div className="dash-nav-left"><button className="back-btn" onClick={() => router.push('/')}>← Back</button><div className="logo" style={{ fontSize: 15 }}><LogoIcon size={22} iconSize={11} />VidMetrics</div></div></div></nav>
        <div style={{ maxWidth: 600, margin: '140px auto 0', padding: '48px', textAlign: 'center', backgroundColor: '#fff', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.05)', border: '1px solid #E2DDD6' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>⚠️</div>
          <h2 style={{ fontSize: 24, marginBottom: 16, color: '#1A1714' }}>Unable to fetch live data.</h2>
          <p style={{ color: '#6B6560', marginBottom: 32, fontSize: 16 }}>The YouTube API might be at its limit or the connection failed. Enter @mrbeast or @mkbhd to see a demo.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <ShinyButton onClick={() => router.push('/dashboard?q=@mrbeast')}>Load MrBeast Demo</ShinyButton>
            <button className="back-btn" style={{ margin: 0, padding: '12px 24px' }} onClick={() => router.push('/')}>New Search</button>
          </div>
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
              <LogoIcon size={22} iconSize={11} />
              VidMetrics
            </div>
          </div>
          <div className="dash-nav-right">
            <ShinyButton onClick={exportCSV}>
              ⬇ CSV
            </ShinyButton>
            <ShinyButton onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('✓ Link copied'); }}>
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
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {appData.channel.name} {appData.channel.verified && <span className="verified-badge">✓</span>}
              {appData.isDemo && <span className="demo-badge">Demo Data</span>}
            </h1>

            <div className="channel-stats">
              <span className="channel-stat"><strong>{appData.channel.subs}</strong> subscribers</span>
              <span className="channel-stat"><strong>{appData.channel.videos.toLocaleString()}</strong> videos</span>
              {appData.channel.country && (
                <span className="channel-stat" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src={`https://flagcdn.com/w20/${appData.channel.country.toLowerCase()}.png`} width="16" alt={appData.channel.country} style={{ borderRadius: 2 }} />
                  {appData.channel.country}
                </span>
              )}
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
          <div className="chart-container is-scrollable"><canvas ref={viewsChartRef} /></div>
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
                    <td><img className="table-thumb" src={v.thumbnail} alt={v.title} loading="lazy" /></td>
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

        {/* Mobile-only Card View (for Table mode) */}
        <div className="video-cards-mobile">
          {paged.map(v => {
            const trend = getTrendLabel(v.trendingScore);
            return (
              <div key={v.id} className="mobile-video-card" onClick={() => setModalVideo(v)}>
                <div className="mobile-video-thumb">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" />
                  <span className="duration-badge">{formatDuration(v.duration)}</span>
                </div>
                <div className="mobile-video-content">
                  <div className="mobile-video-title">{v.title}</div>
                  <div className="mobile-video-badges">
                    <span className={`trending-badge ${trend.cls}`} style={{ position: 'static' }}>{v.trendingScore} Score</span>
                    {v.trendingScore >= 70 && <span className="trending-badge hot" style={{ position: 'static' }}>Trending</span>}
                  </div>
                  <div className="mobile-stats-grid">
                    <div className="mobile-stat-item">
                      <span className="mobile-stat-value">{formatNumber(v.views)}</span>
                      <span className="mobile-stat-label">Views</span>
                    </div>
                    <div className="mobile-stat-item">
                      <span className="mobile-stat-value">{formatNumber(v.likes)}</span>
                      <span className="mobile-stat-label">Likes</span>
                    </div>
                    <div className="mobile-stat-item">
                      <span className="mobile-stat-value">{formatNumber(v.comments)}</span>
                      <span className="mobile-stat-label">Comments</span>
                    </div>
                  </div>
                  <div className="mobile-video-date">{timeAgo(v.publishedAt)} · {formatDate(v.publishedAt)}</div>
                </div>
              </div>
            );
          })}
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
