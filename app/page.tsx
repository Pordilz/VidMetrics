'use client';

import { useState, useRef, useCallback } from 'react';
import { Hero3D } from '@/components/landing/Hero3D';
import { Marquee } from '@/components/landing/Marquee';
import { validateYouTubeURL } from '@/lib/formatters';
import { useRouter } from 'next/navigation';

// SVG Logo Icon Component
const LogoIcon = ({ size = 32, iconSize = 14 }: { size?: number, iconSize?: number }) => (
  <div className="logo-icon" style={{ width: size, height: size, borderRadius: size / 4 }}>
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

export default function LandingPage() {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setError('');
    setIsValid(val.trim() ? validateYouTubeURL(val) : false);
  };

  const handleAnalyze = useCallback(async (query?: string) => {
    const input = (query || inputValue).trim();
    if (!input) {
      setError('Please enter a YouTube channel URL or handle.');
      return;
    }
    if (!validateYouTubeURL(input)) {
      setError("This doesn't look like a valid YouTube channel URL or handle.");
      return;
    }
    setError('');
    setLoading(true);

    // Navigate to dashboard with the query
    router.push(`/dashboard?q=${encodeURIComponent(input)}`);
  }, [inputValue, router]);

  const tryChannel = (handle: string) => {
    setInputValue(handle);
    setIsValid(true);
    // Small delay so user sees the input update
    setTimeout(() => {
      router.push(`/dashboard?q=${encodeURIComponent(handle)}`);
    }, 100);
  };

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="logo">
          <LogoIcon />
          VidMetrics
        </div>
      </nav>

      <div className="landing-hero">
        <div className="hero-content">
          <div className="hero-eyebrow">YouTube Channel Analysis</div>
          <h1 className="hero-headline">
            Know exactly<br />what&apos;s <span className="accent">winning.</span>
          </h1>
          <p className="hero-sub">
            Paste any YouTube channel URL. Get instant competitive intelligence with trending scores, engagement analytics, and basic publishing insights.
          </p>

          <div className="search-container">
            <div className={`search-box ${isValid ? 'valid' : ''}`}>
              <input
                ref={inputRef}
                className="search-input"
                type="text"
                placeholder="Paste a YouTube channel URL or handle…"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="search-status" style={{ color: isValid ? 'var(--color-success)' : undefined }}>
                {isValid ? '✓' : ''}
              </span>
              <button
                className={`search-btn ${loading ? 'loading' : ''}`}
                onClick={() => handleAnalyze()}
                disabled={loading}
              >
                Analyze
              </button>
            </div>
            <div className={`search-error ${error ? 'visible' : ''}`}>{error}</div>

            <div className="try-channels">
              <span className="try-label">Try:</span>
              <button className="try-pill" onClick={() => tryChannel('@MrBeast')}>MrBeast</button>
              <button className="try-pill" onClick={() => tryChannel('@mkbhd')}>MKBHD</button>
              <button className="try-pill" onClick={() => tryChannel('@VeritasiumOfficial')}>Veritasium</button>
              <button className="try-pill" onClick={() => tryChannel('@LinusTechTips')}>Linus Tech Tips</button>
            </div>
          </div>
        </div>

        <Hero3D />
      </div>

      <Marquee />
    </div>
  );
}
