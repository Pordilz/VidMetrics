'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatNumber, formatDuration, timeAgo, formatDate, getTrendLabel } from '@/lib/formatters';
import { deriveRecentChannelLabel, saveRecentChannel } from '@/lib/recent-channels';
/* eslint-disable @next/next/no-img-element */
import { Chart, registerables } from 'chart.js';
import { ArrowLeft, ChevronDown, Download, Info, Link2, X } from 'lucide-react';
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

interface HeatmapDayDetail {
  dateLabel: string;
  summary: string;
  count: number;
}

interface HeatmapTooltipState {
  text: string;
  left: number;
  top: number;
  placement: 'top' | 'bottom';
}

type KPIFormat = 'number' | 'percent';

interface KPIItem {
  id: string;
  label: string;
  value: number;
  format: Exclude<KPIFormat, 'rate'>;
  trend?: 'up' | 'down' | 'neutral';
  trendVal?: string;
  sub?: string;
  details?: string[];
}

interface ComparisonMetric {
  id: string;
  label: string;
  value: number;
  valueText: string;
}


// Curated mock data for demo fallback
const MOCK_MAP: Record<string, AppData> = {
  'mrbeast': mrbeastData,
  'mkbhd': mkbhdData,
  'ucx6oq3dkcsbyne6h8uqquva': mrbeastData,
  'ucbcrf18a7qf58cmattefwwq': mkbhdData
};

const THUMBNAIL_FALLBACK_BACKGROUND = '#F0EDE8';
const THUMBNAIL_FALLBACK_FOREGROUND = '#6B6560';

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildThumbnailFallback(label: string): string {
  const safeLabel = escapeSvgText(label.length > 34 ? `${label.slice(0, 31)}...` : label);

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
      <rect width="320" height="180" fill="${THUMBNAIL_FALLBACK_BACKGROUND}" />
      <text x="160" y="90" text-anchor="middle" dominant-baseline="middle" fill="${THUMBNAIL_FALLBACK_FOREGROUND}" font-family="Arial, sans-serif" font-size="16">
        ${safeLabel}
      </text>
    </svg>
  `)}`;
}

function handleThumbnailError(event: React.SyntheticEvent<HTMLImageElement>, label: string) {
  const element = event.currentTarget;
  if (element.dataset.fallbackApplied === 'true') return;
  element.dataset.fallbackApplied = 'true';
  element.src = buildThumbnailFallback(label);
}

function getDemoThumbnailUrl(video: VideoData): string {
  if (video.id) {
    return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  }

  return video.thumbnail || buildThumbnailFallback(video.title);
}

function buildDemoAppData(data: AppData): AppData {
  return {
    ...data,
    isDemo: true,
    videos: data.videos.map((video) => ({
      ...video,
      thumbnail: getDemoThumbnailUrl(video),
    })),
  };
}

function getAnalysisReferenceTime(videos: VideoData[], isDemo?: boolean): number {
  if (!videos.length) return Date.now();

  if (!isDemo) {
    return Date.now();
  }

  const latestPublishedAt = Math.max(...videos.map((video) => new Date(video.publishedAt).getTime()));
  return Number.isFinite(latestPublishedAt) ? latestPublishedAt : Date.now();
}

function parseCompactNumber(value: string): number {
  const trimmed = value.trim().toUpperCase();
  const numeric = Number.parseFloat(trimmed);

  if (Number.isNaN(numeric)) return 0;
  if (trimmed.endsWith('B')) return numeric * 1_000_000_000;
  if (trimmed.endsWith('M')) return numeric * 1_000_000;
  if (trimmed.endsWith('K')) return numeric * 1_000;

  return numeric;
}

function getComparisonSummary(data: AppData): ComparisonMetric[] {
  const averageViews = data.videos.length
    ? Math.round(data.videos.reduce((sum, video) => sum + video.views, 0) / data.videos.length)
    : 0;
  const averageEngagement = data.videos.length
    ? data.videos.reduce((sum, video) => sum + video.engagementRate, 0) / data.videos.length
    : 0;

  return [
    {
      id: 'subscribers',
      label: 'Subscribers',
      value: parseCompactNumber(data.channel.subs),
      valueText: data.channel.subs,
    },
    {
      id: 'videos',
      label: 'Videos',
      value: data.channel.videos,
      valueText: data.channel.videos.toLocaleString(),
    },
    {
      id: 'avg-views',
      label: 'Avg Views',
      value: averageViews,
      valueText: formatNumber(averageViews),
    },
    {
      id: 'avg-engagement',
      label: 'Avg Engagement',
      value: averageEngagement,
      valueText: `${averageEngagement.toFixed(2)}%`,
    },
  ];
}

function getTrendDelta(current: number, previous: number): Pick<KPIItem, 'trend' | 'trendVal'> {
  if (previous <= 0) {
    if (current > 0) {
      return { trend: 'up', trendVal: 'New vs prior window' };
    }

    return { trend: 'neutral', trendVal: 'No prior baseline' };
  }

  const deltaPct = ((current - previous) / previous) * 100;

  if (Math.abs(deltaPct) < 1) {
    return { trend: 'neutral', trendVal: 'Within 1% of prior window' };
  }

  return {
    trend: deltaPct > 0 ? 'up' : 'down',
    trendVal: `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prior window`,
  };
}


// ===== Parse ISO 8601 duration (PT1H2M3S) to seconds =====
function parseDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
}

// ===== TRY TO FETCH FROM REAL API, FALLBACK TO CURATED DEMO =====
async function fetchChannelData(query: string): Promise<AppData | null> {
  const normalized = query.toLowerCase().replace(/[@/]|https?:\/\/.*\/|www\.youtube\.com\//g, '');

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
  } catch {
    if (MOCK_MAP[normalized]) {
      return buildDemoAppData(MOCK_MAP[normalized]);
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
  const [currentView, setCurrentView] = useState<'grid' | 'table'>('table');
  const [currentSort, setCurrentSort] = useState('trending');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVideo, setModalVideo] = useState<VideoData | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);

  const viewsChartRef = useRef<HTMLCanvasElement>(null);
  const engChartRef = useRef<HTMLCanvasElement>(null);
  const viewsChartInstance = useRef<Chart | null>(null);
  const engChartInstance = useRef<Chart | null>(null);
  const heatmapCardRef = useRef<HTMLDivElement>(null);

  const perPage = 12;
  const [isMobile, setIsMobile] = useState(false);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<HeatmapDayDetail | null>(null);
  const [heatmapTooltip, setHeatmapTooltip] = useState<HeatmapTooltipState | null>(null);
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const [showTrendingInfo, setShowTrendingInfo] = useState(false);
  const [showComparisonComposer, setShowComparisonComposer] = useState(false);
  const [comparisonInput, setComparisonInput] = useState('');
  const [comparisonData, setComparisonData] = useState<AppData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [liveUrl, setLiveUrl] = useState('');

  useEffect(() => {
    if (query) {
      setLoading(true);
      setFetchError(false);
      fetchChannelData(query).then(data => {
        if (data) {
          setAppData(data);
          saveRecentChannel({
            name: data.channel.name,
            query,
            label: deriveRecentChannelLabel(query, data.channel.name),
            thumbnail: data.channel.thumbnail,
            viewedAt: new Date().toISOString(),
          });
        } else {
          setAppData(null);
          setFetchError(true);
        }
        setLoading(false);
      });
    }
  }, [query]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    syncViewport();
    setLiveUrl(window.location.href);
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);


  // Render charts when data loads
  useEffect(() => {
    if (!appData || loading) return;
    renderCharts();
    return () => {
      viewsChartInstance.current?.destroy();
      engChartInstance.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appData, loading, isMobile]);

  function renderCharts() {
    if (!appData) return;
    const { videos } = appData;
    const sorted = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()).slice(-30);

    viewsChartInstance.current?.destroy();
    engChartInstance.current?.destroy();

    if (!isMobile && viewsChartRef.current) {
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

  const copyDashboardLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('✓ Link copied');
    } catch {
      showToast('Unable to copy link');
    }
  }, [showToast]);

  const showHeatmapTooltip = useCallback((event: React.SyntheticEvent<HTMLElement>, detail: HeatmapDayDetail) => {
    const cardRect = heatmapCardRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();

    if (!cardRect) return;

    const padding = 104;
    const anchorLeft = targetRect.left - cardRect.left + targetRect.width / 2;
    const placement = targetRect.top - cardRect.top < 84 ? 'bottom' : 'top';
    const left = Math.min(Math.max(anchorLeft, padding), cardRect.width - padding);
    const top = placement === 'top'
      ? targetRect.top - cardRect.top - 10
      : targetRect.bottom - cardRect.top + 10;

    setHeatmapTooltip({
      text: `${detail.dateLabel}: ${detail.summary}`,
      left,
      top,
      placement,
    });
  }, []);

  const hideHeatmapTooltip = useCallback(() => {
    setHeatmapTooltip(null);
  }, []);

  useEffect(() => {
    setSelectedHeatmapDay(null);
    setHeatmapTooltip(null);
    setExpandedKpi(null);
    setShowTrendingInfo(false);
    setCurrentView('table');
    setCurrentSort('trending');
    setSortDir('desc');
    setTrendingOnly(false);
    setSearchQ('');
    setDateFilter('all');
    setCurrentPage(1);
    setModalVideo(null);
    setShowComparisonComposer(false);
    setComparisonInput('');
    setComparisonData(null);
    setComparisonError('');
    if (typeof window !== 'undefined') {
      setLiveUrl(window.location.href);
    }
  }, [appData, query]);

  useEffect(() => {
    if (isMobile) {
      setHeatmapTooltip(null);
    }
  }, [isMobile]);

  // ===== EXPORT CSV =====
  const exportCSV = () => {
    if (!appData) return;
    const headers = ['Title','Published','Views','Likes','Comments','Duration','Engagement Rate','VidScore'];
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

  const handleComparisonSubmit = async () => {
    const nextQuery = comparisonInput.trim();

    if (!nextQuery) {
      setComparisonError('Enter a channel URL or handle to compare.');
      return;
    }

    if (nextQuery.toLowerCase() === query.trim().toLowerCase()) {
      setComparisonError('This channel is already loaded in the main view.');
      return;
    }

    setComparisonLoading(true);
    setComparisonError('');

    const data = await fetchChannelData(nextQuery);

    if (!data) {
      setComparisonLoading(false);
      setComparisonError('We could not load that comparison channel.');
      return;
    }

    setComparisonData(data);
    setShowComparisonComposer(false);
    setComparisonLoading(false);
    saveRecentChannel({
      name: data.channel.name,
      query: nextQuery,
      label: deriveRecentChannelLabel(nextQuery, data.channel.name),
      thumbnail: data.channel.thumbnail,
      viewedAt: new Date().toISOString(),
    });
    showToast(`Comparing with ${data.channel.name}`);
  };

  // ===== FILTER & SORT =====
  const getFilteredVideos = useCallback(() => {
    if (!appData) return [];
    const now = getAnalysisReferenceTime(appData.videos, appData.isDemo);
    const filtered = appData.videos.filter(v => {
      if (searchQ && !v.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter);
        if ((now - new Date(v.publishedAt).getTime()) > days * 86400000) return false;
      }
      if (trendingOnly && v.trendingScore < 60) return false;
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

  const getTrendIcon = (trend: NonNullable<KPIItem['trend']>) => (
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  );

  const getKpiDisplay = (value: number, format: KPIFormat) => {
    if (format === 'number') {
      if (value >= 100000000) return { numericValue: value / 1000000, suffix: 'M', decimalPlaces: 0, compact: true };
      if (value >= 1000000) return { numericValue: value / 1000000, suffix: 'M', decimalPlaces: 1, compact: false };
      if (value >= 100000) return { numericValue: value / 1000, suffix: 'K', decimalPlaces: 0, compact: true };
      if (value >= 1000) return { numericValue: value / 1000, suffix: 'K', decimalPlaces: 1, compact: false };
      return { numericValue: value, suffix: '', decimalPlaces: 0, compact: false };
    }

    if (format === 'percent') {
      return { numericValue: value, suffix: '%', decimalPlaces: 2, compact: value >= 10 };
    }

    return { numericValue: value, suffix: '', decimalPlaces: 0, compact: false };
  };

  // ===== KPIs =====
  const getKPIs = (): KPIItem[] => {
    if (!appData) return [];
    const { videos } = appData;
    const now = getAnalysisReferenceTime(videos, appData.isDemo);
    const last30 = videos.filter(v => (now - new Date(v.publishedAt).getTime()) < 30 * 86400000);
    const prev30 = videos.filter(v => {
      const age = now - new Date(v.publishedAt).getTime();
      return age >= 30 * 86400000 && age < 60 * 86400000;
    });
    const totalViews30 = last30.reduce((s, v) => s + v.views, 0);
    const prevTotalViews30 = prev30.reduce((s, v) => s + v.views, 0);
    const avgViews = videos.length ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0;
    const topVideo = [...videos].sort((a, b) => b.views - a.views)[0];
    const avgEng = videos.length ? (videos.reduce((s, v) => s + v.engagementRate, 0) / videos.length).toFixed(2) : '0';
    const last30AvgEng = last30.length ? last30.reduce((s, v) => s + v.engagementRate, 0) / last30.length : 0;
    const prev30AvgEng = prev30.length ? prev30.reduce((s, v) => s + v.engagementRate, 0) / prev30.length : 0;
    const sortedViews = [...videos].map(v => v.views).sort((a, b) => a - b);
    const mid = Math.floor(sortedViews.length / 2);
    const medianViews = sortedViews.length % 2 === 0
      ? Math.round(((sortedViews[mid - 1] || 0) + (sortedViews[mid] || 0)) / 2)
      : (sortedViews[mid] || 0);
    const recentAvgViews = last30.length ? Math.round(totalViews30 / last30.length) : 0;
    const previousAvgViews = prev30.length ? Math.round(prevTotalViews30 / prev30.length) : 0;
    const viewsTrend = getTrendDelta(totalViews30, prevTotalViews30);
    const avgViewsTrend = getTrendDelta(recentAvgViews || avgViews, previousAvgViews || avgViews);
    const engagementTrend = getTrendDelta(last30AvgEng || parseFloat(avgEng), prev30AvgEng || parseFloat(avgEng));

    const kpis: KPIItem[] = [
      {
        id: 'views-30-days',
        label: 'Views (30 Days)',
        value: totalViews30,
        format: 'number',
        trend: viewsTrend.trend,
        trendVal: viewsTrend.trendVal,
        details: [
          `${last30.length} uploads contributed to this 30-day total.`,
          `Recent uploads average ${formatNumber(recentAvgViews)} views each.`,
        ],
      },
      {
        id: 'avg-views',
        label: 'Avg Views / Video',
        value: avgViews,
        format: 'number',
        trend: avgViewsTrend.trend,
        trendVal: avgViewsTrend.trendVal,
        details: [
          `Average taken across ${videos.length.toLocaleString()} fetched videos.`,
          `Median performance sits at ${formatNumber(medianViews)} views.`,
          prev30.length ? `Recent uploads average ${formatNumber(recentAvgViews)} views vs ${formatNumber(previousAvgViews)} in the prior 30-day window.` : 'Not enough prior-window uploads yet for a fuller comparison.',
        ],
      },
      {
        id: 'top-video',
        label: 'Top Video Views',
        value: topVideo?.views || 0,
        format: 'number',
        sub: topVideo ? topVideo.title.slice(0, 30) + '…' : '',
        details: topVideo ? [
          topVideo.title,
          `${formatNumber(topVideo.views)} views · ${timeAgo(topVideo.publishedAt)} · ${topVideo.engagementRate.toFixed(2)}% engagement`,
        ] : ['No top video data available yet.'],
      },
      {
        id: 'avg-engagement',
        label: 'Avg Engagement',
        value: parseFloat(avgEng),
        format: 'percent',
        trend: engagementTrend.trend,
        trendVal: engagementTrend.trendVal,
        details: [
          `Calculated from likes and comments relative to views across ${videos.length.toLocaleString()} videos.`,
          'Channels often land in different healthy ranges depending on format, audience, and upload style.',
        ],
      },
    ];

    return kpis;
  };

  // ===== INSIGHTS =====
  const getInsights = () => {
    if (!appData) return [];
    const { videos } = appData;
    const insights: { type: string; icon: string; title: string; body: string }[] = [];
    const now = getAnalysisReferenceTime(videos, appData.isDemo);
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
    const today = new Date(getAnalysisReferenceTime(videos, appData.isDemo));
    const activeWeeks = new Set(videos.map((video) => {
      const publishedAt = new Date(video.publishedAt);
      const startOfYear = new Date(publishedAt.getFullYear(), 0, 1);
      return `${publishedAt.getFullYear()}-${Math.ceil((publishedAt.getTime() - startOfYear.getTime()) / 604800000)}`;
    }));
    const uploadsLast30 = videos.filter((video) => (today.getTime() - new Date(video.publishedAt).getTime()) < 30 * 86400000).length;
    const weeklyCadence = activeWeeks.size ? (videos.length / activeWeeks.size).toFixed(1) : '0.0';
    
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

        const detail = {
          dateLabel: formatDate(date.toISOString()),
          count,
          summary: count > 0 ? `${count} video${count !== 1 ? 's' : ''}` : 'No videos',
        };

        cells.push(
          <button
            key={`${w}-${d}`}
            type="button"
            className={`heatmap-cell ${cls} ${selectedHeatmapDay?.dateLabel === detail.dateLabel ? 'selected' : ''}`}
            aria-label={`${detail.dateLabel}: ${detail.summary}`}
            onMouseEnter={(event) => showHeatmapTooltip(event, detail)}
            onFocus={(event) => showHeatmapTooltip(event, detail)}
            onMouseLeave={hideHeatmapTooltip}
            onBlur={hideHeatmapTooltip}
            onClick={(event) => {
              setSelectedHeatmapDay(detail);
              if (!isMobile) {
                showHeatmapTooltip(event, detail);
              }
            }}
          />
        );
      }
      weeks.push(<div key={w} className="heatmap-col">{cells}</div>);
    }

    return (
      <div className="heatmap-section">
        <div className="heatmap-card" ref={heatmapCardRef}>
          <div className="chart-label">Cadence</div>
          <div className="chart-title">Publishing Calendar</div>
          <div className="chart-subtitle" style={{ marginBottom: 16 }}>
            {isMobile ? 'Tap a day to inspect uploads across the last 52 weeks' : 'Upload frequency heatmap — last 52 weeks'}
          </div>
          <div className="heatmap-summary">
            <div className="heatmap-summary-pill">
              <strong>{weeklyCadence}</strong>
              <span>uploads / active week</span>
            </div>
            <div className="heatmap-summary-pill">
              <strong>{uploadsLast30}</strong>
              <span>uploads in the last 30 days</span>
            </div>
          </div>
          <div className="heatmap-container">
            <div className="heatmap-days">
              {days.map(d => <span key={d} className="heatmap-day-label">{d}</span>)}
            </div>
            <div className="heatmap-grid">{weeks}</div>
          </div>
          {heatmapTooltip && !isMobile && (
            <div
              className={`heatmap-tooltip-bubble ${heatmapTooltip.placement === 'bottom' ? 'is-bottom' : ''}`}
              style={{ left: heatmapTooltip.left, top: heatmapTooltip.top }}
            >
              {heatmapTooltip.text}
            </div>
          )}
          <div className="heatmap-mobile-detail">
            <div className="heatmap-mobile-detail-label">Selected Day</div>
            {selectedHeatmapDay ? (
              <div className="heatmap-mobile-detail-body">
                <strong>{selectedHeatmapDay.dateLabel}</strong>
                <span>{selectedHeatmapDay.summary}</span>
              </div>
            ) : (
              <div className="heatmap-mobile-detail-body">
                <strong>Choose any day</strong>
                <span>Tap a cell to inspect how many uploads landed on that date.</span>
              </div>
            )}
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
  const primarySummary = getComparisonSummary(appData);
  const comparisonSummary = comparisonData ? getComparisonSummary(comparisonData) : null;
  const recentPerformanceVideos = [...appData.videos]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 6);
  const maxRecentViews = recentPerformanceVideos.reduce((max, video) => Math.max(max, video.views), 1);
  const sortOptions = [
    { key: 'trending', label: 'VidScore' }, { key: 'date', label: 'Date' }, { key: 'views', label: 'Views' }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'engagement', label: 'Engagement' }
  ];

  return (
    <div className="dashboard-page">
      {/* Nav */}
      <nav className="dash-nav">
        <div className="dash-nav-inner">
          <div className="dash-nav-left">
            <button className="back-btn" onClick={() => router.push('/')}>
              <ArrowLeft size={16} />
              <span>New Search</span>
            </button>
            <div className="dash-nav-divider" />
            <div className="logo" style={{ fontSize: 15 }}>
              <LogoIcon size={22} iconSize={11} />
              VidMetrics
            </div>
          </div>
          <div className="dash-nav-label">Channel Dashboard</div>
        </div>
      </nav>

      {/* Channel Header */}
      <div className="channel-header">
        <div className="channel-header-top">
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
                    <img
                      src={`https://flagcdn.com/w20/${appData.channel.country.toLowerCase()}.png`}
                      width="16"
                      alt={appData.channel.country}
                      style={{ borderRadius: 2 }}
                      onError={(event) => {
                        (event.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {appData.channel.country}
                  </span>
                )}
                <span className="channel-stat">Since {formatDate(appData.channel.created)}</span>
              </div>
            </div>
          </div>

          <div className="channel-actions-stack">
            <div className="channel-actions-panel">
              <div className="channel-actions-label">Share This Snapshot</div>
              <div className="channel-actions">
                <button className="channel-action-btn primary" onClick={exportCSV}>
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
                <button className="channel-action-btn secondary" onClick={copyDashboardLink}>
                  <Link2 size={16} />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            <div className="channel-actions-panel comparison-controls">
              <div className="channel-actions-label">Comparison Mode</div>
              <button
                type="button"
                className="channel-action-btn secondary comparison-trigger"
                onClick={() => {
                  setShowComparisonComposer((previous) => !previous);
                  setComparisonError('');
                }}
              >
                <span>+ Add Channel</span>
              </button>

              {showComparisonComposer ? (
                <div className="comparison-form">
                  <input
                    className="comparison-input"
                    type="text"
                    value={comparisonInput}
                    placeholder="Paste a URL or @handle"
                    onChange={(event) => setComparisonInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleComparisonSubmit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="channel-action-btn primary comparison-submit"
                    onClick={() => void handleComparisonSubmit()}
                    disabled={comparisonLoading}
                  >
                    <span>{comparisonLoading ? 'Loading…' : 'Compare'}</span>
                  </button>
                </div>
              ) : null}

              {comparisonError ? <p className="comparison-error">{comparisonError}</p> : null}
              {comparisonData ? (
                <div className="comparison-current">
                  <span>Comparing against</span>
                  <strong>{comparisonData.channel.name}</strong>
                  <button
                    type="button"
                    className="comparison-clear"
                    onClick={() => {
                      setComparisonData(null);
                      setComparisonInput('');
                      setComparisonError('');
                    }}
                    aria-label="Clear comparison channel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {comparisonData && comparisonSummary ? (
        <div className="comparison-section">
          <div className="comparison-section-header">
            <div>
              <div className="section-label">Compare</div>
              <div className="section-title comparison-title">Side-by-side channel snapshot</div>
            </div>
            <span className="comparison-caption">A quick read on how the active channel stacks up right now.</span>
          </div>
          <div className="comparison-row">
            <div className="comparison-card">
              <div className="comparison-card-label">Primary Channel</div>
              <div className="comparison-card-title">{appData.channel.name}</div>
              <div className="comparison-metrics">
                {primarySummary.map((metric) => (
                  <div key={metric.id} className="comparison-metric">
                    <span className="comparison-metric-label">{metric.label}</span>
                    <strong>{metric.valueText}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="comparison-divider" />

            <div className="comparison-card">
              <div className="comparison-card-label">Comparison Channel</div>
              <div className="comparison-card-title">{comparisonData.channel.name}</div>
              <div className="comparison-metrics">
                {comparisonSummary.map((metric, index) => {
                  const baseline = primarySummary[index];
                  const delta = metric.value - baseline.value;
                  const deltaDirection = delta === 0 ? 'neutral' : delta > 0 ? 'up' : 'down';
                  const deltaText = baseline.id === 'avg-engagement'
                    ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)} pts`
                    : `${delta > 0 ? '+' : ''}${formatNumber(Math.round(delta))}`;

                  return (
                    <div key={metric.id} className="comparison-metric">
                      <div className="comparison-metric-topline">
                        <span className="comparison-metric-label">{metric.label}</span>
                        <span className={`comparison-delta ${deltaDirection}`}>{deltaText}</span>
                      </div>
                      <strong>{metric.valueText}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <BlurFade key={i} delay={0.1 + i * 0.05} inView>
            <SpotlightCard className={`kpi-card !border-0 ${expandedKpi === k.id ? 'is-expanded' : ''}`} spotlightColor="rgba(232, 68, 26, 0.05)" data-kpi-id={k.id}>
              <button
                type="button"
                className={`kpi-toggle ${k.details?.length ? 'is-expandable' : ''}`}
                onClick={() => k.details?.length ? setExpandedKpi(prev => prev === k.id ? null : k.id) : undefined}
                aria-expanded={expandedKpi === k.id}
              >
                <div className="kpi-topline">
                  <div className="kpi-label">{k.label}</div>
                  {k.details?.length ? (
                    <span className={`kpi-expand-indicator ${expandedKpi === k.id ? 'is-open' : ''}`}>
                      <span>Details</span>
                      <ChevronDown size={14} />
                    </span>
                  ) : null}
                </div>
                {(() => {
                  const display = getKpiDisplay(k.value, k.format);
                  return (
                    <div className={`kpi-value relative ${display.compact ? 'is-compact' : ''}`}>
                      <NumberTicker
                        value={display.numericValue}
                        decimalPlaces={display.decimalPlaces}
                        className="kpi-number-ticker"
                      />
                      {display.suffix ? <span className="kpi-suffix">{display.suffix}</span> : null}
                    </div>
                  );
                })()}
                {k.trend && <div className={`kpi-trend ${k.trend}`}>{getTrendIcon(k.trend)} {k.trendVal}</div>}
                {k.sub && <div className="kpi-sub">{k.sub}</div>}
              </button>
              {expandedKpi === k.id && k.details?.length ? (
                <div className="kpi-detail-panel">
                  {k.details.map((detail, detailIndex) => (
                    <p key={`${k.id}-${detailIndex}`} className="kpi-detail-line">{detail}</p>
                  ))}
                </div>
              ) : null}
            </SpotlightCard>
          </BlurFade>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card desktop-performance-chart">
          <div className="chart-label">Performance</div>
          <div className="chart-title">Views Over Time</div>
          <div className="chart-subtitle">Per-video view counts by publish date</div>
          <div className="chart-container is-scrollable"><canvas ref={viewsChartRef} /></div>
        </div>
        <div className="chart-card mobile-performance-chart">
          <div className="chart-label">Performance</div>
          <div className="chart-title">Recent Upload Performance</div>
          <div className="chart-subtitle">A touch-friendly snapshot of the latest videos</div>
          <div className="mobile-performance-list">
            {recentPerformanceVideos.map(v => (
              <button key={v.id} type="button" className="mobile-performance-item" onClick={() => setModalVideo(v)}>
                <div className="mobile-performance-head">
                  <div className="mobile-performance-title">{v.title}</div>
                  <div className="mobile-performance-value">{formatNumber(v.views)}</div>
                </div>
                <div className="mobile-performance-meta">
                  <span>{timeAgo(v.publishedAt)}</span>
                  <span>{v.engagementRate.toFixed(2)}% eng.</span>
                  <span>VidScore {v.trendingScore}</span>
                </div>
                <div className="mobile-performance-bar">
                  <span style={{ width: `${Math.max(16, (v.views / maxRecentViews) * 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
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

        <div className={`trending-score-info ${showTrendingInfo ? 'is-open' : ''}`}>
          <button
            type="button"
            className="trending-score-trigger"
            onClick={() => setShowTrendingInfo(prev => !prev)}
            aria-expanded={showTrendingInfo}
          >
            <Info size={14} />
            <span>What does Trending Score mean?</span>
          </button>
          {showTrendingInfo ? (
            <div className="trending-score-panel">
              <p>Trending Score is a blended signal based on recency momentum, view velocity against the channel average, and engagement strength.</p>
              <p>In this dashboard it weighs fresh uploads at 40%, relative view performance at 35%, and engagement rate at 25%.</p>
              <p>Scores above 60 usually indicate a video that is outperforming the rest of the recent catalog.</p>
            </div>
          ) : null}
        </div>

        {/* Grid View */}
        <div className={`video-grid ${currentView === 'table' ? 'hidden' : ''}`}>
          {paged.map((v, i) => {
            const trend = getTrendLabel(v.trendingScore);
            return (
              <div
                key={v.id}
                className="video-card revealed"
                style={{ transitionDelay: `${i * 0.04}s` }}
                onClick={() => setModalVideo(v)}
                data-video-id={v.id}
                data-video-views={v.views}
                data-video-likes={v.likes}
                data-video-published={v.publishedAt}
                data-video-vidscore={v.trendingScore}
              >
                <div className="video-thumb">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" onError={(event) => handleThumbnailError(event, v.title)} />
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
            <thead><tr><th></th><th>Title</th><th>Published</th><th>Views</th><th>Likes</th><th>Comments</th><th>Eng. Rate</th><th>VidScore</th></tr></thead>
            <tbody>
              {paged.map(v => {
                const trend = getTrendLabel(v.trendingScore);
                return (
                  <tr
                    key={v.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setModalVideo(v)}
                    data-video-id={v.id}
                    data-video-views={v.views}
                    data-video-likes={v.likes}
                    data-video-published={v.publishedAt}
                    data-video-vidscore={v.trendingScore}
                  >
                    <td><img className="table-thumb" src={v.thumbnail} alt={v.title} loading="lazy" onError={(event) => handleThumbnailError(event, v.title)} /></td>
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
              <div
                key={v.id}
                className="mobile-video-card"
                onClick={() => setModalVideo(v)}
                data-video-id={v.id}
                data-video-views={v.views}
                data-video-likes={v.likes}
                data-video-published={v.publishedAt}
                data-video-vidscore={v.trendingScore}
              >
                <div className="mobile-video-thumb">
                  <img src={v.thumbnail} alt={v.title} loading="lazy" onError={(event) => handleThumbnailError(event, v.title)} />
                  <span className="duration-badge">{formatDuration(v.duration)}</span>
                </div>
                <div className="mobile-video-content">
                  <div className="mobile-video-title">{v.title}</div>
                  <div className="mobile-video-badges">
                    <span className={`trending-badge ${trend.cls}`} style={{ position: 'static' }}>{v.trendingScore} VidScore</span>
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
            <img className="modal-thumb" src={modalVideo.thumbnail} alt={modalVideo.title} onError={(event) => handleThumbnailError(event, modalVideo.title)} />
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

      <footer className="dashboard-footer">
        <div className="dashboard-footer-inner">
          <div>
            <div className="site-footer-label">Live URL</div>
            <a className="site-footer-link" href={liveUrl || '/'}>{liveUrl || 'Loading…'}</a>
          </div>
          <div className="dashboard-footer-note">Demo-ready competitive YouTube analysis with touch-friendly mobile views, VidScore sorting, exports, and channel comparison.</div>
        </div>
      </footer>
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
