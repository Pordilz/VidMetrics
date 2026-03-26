export function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getTrendLabel(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: '🔥 Hot', cls: 'hot' };
  if (score >= 60) return { label: '📈 Rising', cls: 'rising' };
  if (score >= 40) return { label: '📊 Stable', cls: 'stable' };
  return { label: '📉 Fading', cls: 'fading' };
}

export const FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪',
  JP: '🇯🇵', KR: '🇰🇷', BR: '🇧🇷', IN: '🇮🇳', FR: '🇫🇷',
  MX: '🇲🇽', ES: '🇪🇸', IT: '🇮🇹', NL: '🇳🇱', SE: '🇸🇪',
  NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', PL: '🇵🇱', RU: '🇷🇺',
  TR: '🇹🇷', SA: '🇸🇦', AE: '🇦🇪', EG: '🇪🇬', ZA: '🇿🇦',
  NG: '🇳🇬', KE: '🇰🇪', PH: '🇵🇭', ID: '🇮🇩', TH: '🇹🇭',
  VN: '🇻🇳', MY: '🇲🇾', SG: '🇸🇬', TW: '🇹🇼', HK: '🇭🇰',
  PK: '🇵🇰', BD: '🇧🇩', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴',
  PE: '🇵🇪', PT: '🇵🇹', IE: '🇮🇪', AT: '🇦🇹', CH: '🇨🇭',
  BE: '🇧🇪', NZ: '🇳🇿', RO: '🇷🇴', UA: '🇺🇦', CZ: '🇨🇿',
  GR: '🇬🇷', HU: '🇭🇺', IL: '🇮🇱', JO: '🇯🇴', LB: '🇱🇧',
};

export function validateYouTubeURL(input: string): boolean {
  const patterns = [
    /youtube\.com\/@[\w.-]+/i,
    /youtube\.com\/channel\/UC[\w-]+/i,
    /youtube\.com\/c\/[\w.-]+/i,
    /youtube\.com\/user\/[\w.-]+/i,
    /youtube\.com\/watch\?v=[\w-]+/i,
    /youtu\.be\/[\w-]+/i,
    /^@[\w.-]+$/,
    /^[\w.-]{3,}$/
  ];
  return patterns.some(p => p.test(input.trim()));
}
