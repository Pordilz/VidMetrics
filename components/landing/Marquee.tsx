'use client';

import { useEffect, useRef } from 'react';

const MARQUEE_ITEMS = [
  '48.2M views analyzed today',
  '12,847 channels tracked',
  'Updated every 6 hours',
  '3.2M trending scores calculated',
  '890K channel snapshots generated',
  '156 countries covered',
  'Real-time engagement monitoring',
  'Basic publishing insights'
];

export function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.innerHTML = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
        .map(t => `<span class="marquee-item"><span class="marquee-dot"></span>${t}</span>`)
        .join('');
    }
  }, []);

  return (
    <div className="landing-marquee">
      <div className="marquee-track" ref={trackRef} />
    </div>
  );
}
