export const RECENT_CHANNELS_STORAGE_KEY = 'vidmetrics.recentChannels';
const MAX_RECENT_CHANNELS = 6;

export interface RecentChannel {
  name: string;
  query: string;
  label: string;
  thumbnail?: string;
  viewedAt: string;
}

function normalizeRecentQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function deriveRecentChannelLabel(query: string, fallbackName: string): string {
  const trimmed = query.trim();
  if (!trimmed) return fallbackName;

  if (trimmed.startsWith('@')) {
    return trimmed;
  }

  const handleMatch = trimmed.match(/youtube\.com\/(@[\w.-]+)/i);
  if (handleMatch?.[1]) {
    return handleMatch[1];
  }

  if (!trimmed.startsWith('http') && /^[\w.-]{3,}$/i.test(trimmed)) {
    return `@${trimmed}`;
  }

  return fallbackName;
}

export function loadRecentChannels(): RecentChannel[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_CHANNELS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is RecentChannel => {
      return typeof item?.name === 'string'
        && typeof item?.query === 'string'
        && typeof item?.label === 'string'
        && typeof item?.viewedAt === 'string';
    });
  } catch {
    return [];
  }
}

export function saveRecentChannel(channel: Omit<RecentChannel, 'label'> & { label?: string }) {
  if (typeof window === 'undefined') return;

  const entry: RecentChannel = {
    ...channel,
    label: channel.label || deriveRecentChannelLabel(channel.query, channel.name),
  };

  const existing = loadRecentChannels();
  const next = [
    entry,
    ...existing.filter((item) => normalizeRecentQuery(item.query) !== normalizeRecentQuery(entry.query)),
  ].slice(0, MAX_RECENT_CHANNELS);

  window.localStorage.setItem(RECENT_CHANNELS_STORAGE_KEY, JSON.stringify(next));
}
