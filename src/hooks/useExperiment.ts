import { useState, useEffect } from 'react';
import { getVariant, trackExperimentEvent } from '@/utils/abTesting';

/**
 * React hook for A/B testing experiments
 * 
 * @param experimentName - Name of the experiment
 * @param defaultVariant - Default variant to use if experiment is not active or fails
 * @returns Object with variant name, loading state, and tracking function
 * 
 * @example
 * const { variant, isLoading, trackEvent } = useExperiment('hero_cta_test', 'control');
 * 
 * if (isLoading) return <Skeleton />;
 * 
 * return (
 *   <button onClick={() => trackEvent('cta_clicked')}>
 *     {variant === 'control' ? 'Get Started' : 'Try Now Free'}
 *   </button>
 * );
 */
export function useExperiment(
  experimentName: string,
  defaultVariant: string = 'control'
) {
  const [variant, setVariant] = useState<string>(defaultVariant);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const assignVariant = async () => {
      const visitorId = localStorage.getItem('visitorId') || 
        `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sessionId = sessionStorage.getItem('sessionId') || 
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store IDs if they don't exist
      if (!localStorage.getItem('visitorId')) {
        localStorage.setItem('visitorId', visitorId);
      }
      if (!sessionStorage.getItem('sessionId')) {
        sessionStorage.setItem('sessionId', sessionId);
      }

      const userId = undefined; // Can be retrieved from auth context if needed

      try {
        const assignedVariant = await getVariant(
          experimentName,
          visitorId,
          sessionId,
          userId
        );

        if (assignedVariant) {
          setVariant(assignedVariant);
          
          // Track experiment exposure
          await trackExperimentEvent(
            experimentName,
            assignedVariant,
            'exposed'
          );
        } else {
          setVariant(defaultVariant);
        }
      } catch (error) {
        console.error('Error assigning variant:', error);
        setVariant(defaultVariant);
      } finally {
        setIsLoading(false);
      }
    };

    assignVariant();
  }, [experimentName, defaultVariant]);

  /**
   * Track an event for this experiment
   */
  const trackEvent = async (eventName: string, metadata?: Record<string, any>) => {
    await trackExperimentEvent(experimentName, variant, eventName, metadata);
  };

  return {
    variant,
    isLoading,
    trackEvent,
  };
}
