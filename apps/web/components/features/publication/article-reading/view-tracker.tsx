'use client';

import { useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ViewTrackerProps {
  articleId: string;
}

export function ViewTracker({ articleId }: ViewTrackerProps) {
  const startTimeRef = useRef(0);
  const viewRecordedRef = useRef(false);

  // Record view on mount
  useEffect(() => {
    if (viewRecordedRef.current) return;
    viewRecordedRef.current = true;

    fetch(`${API_BASE_URL}/api/v1/articles/${articleId}/metrics/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralSource: typeof document !== 'undefined' ? document.referrer || null : null,
      }),
    }).catch(() => {
      // Fire-and-forget — do not block article rendering
    });
  }, [articleId]);

  // Track engagement on unmount / page unload
  useEffect(() => {
    startTimeRef.current = Date.now();

    const sendEngagement = () => {
      const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      const scrollDepth =
        scrollHeight > 0 ? Math.min(100, Math.floor((window.scrollY / scrollHeight) * 100)) : 100;

      const payload = JSON.stringify({
        timeOnPageSeconds: timeOnPage,
        scrollDepthPercent: scrollDepth,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${API_BASE_URL}/api/v1/articles/${articleId}/metrics/engagement`,
          new Blob([payload], { type: 'application/json' }),
        );
      }
    };

    window.addEventListener('beforeunload', sendEngagement);
    return () => {
      window.removeEventListener('beforeunload', sendEngagement);
    };
  }, [articleId]);

  return null;
}
