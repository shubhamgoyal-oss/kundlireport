import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

let lastScrollY = 0;
let scrollCount = 0;

export const useScrollTracking = () => {
  useEffect(() => {
    const handleScroll = () => {
      // Check if we should track post-calculation scrolls
      const shouldTrack = sessionStorage.getItem('track_post_calculation_scroll') === 'true';
      if (!shouldTrack) return;

      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);

      // Only track significant scrolls (more than 100px)
      if (scrollDelta > 100) {
        scrollCount++;
        lastScrollY = currentScrollY;

        const calculationStartTime = sessionStorage.getItem('calculation_start_time');
        const timeSinceCalculation = calculationStartTime 
          ? Date.now() - parseInt(calculationStartTime)
          : null;

        trackEvent('post_calculation_scroll', {
          metadata: {
            scroll_count: scrollCount,
            scroll_position_y: currentScrollY,
            page_height: document.documentElement.scrollHeight,
            viewport_height: window.innerHeight,
            time_since_calculation_ms: timeSinceCalculation,
            scroll_direction: currentScrollY > (lastScrollY || 0) ? 'down' : 'up'
          }
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};
