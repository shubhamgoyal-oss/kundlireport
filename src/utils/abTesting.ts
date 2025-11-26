import { supabase } from "@/integrations/supabase/client";
import { trackEvent as trackAnalyticsEvent } from "@/lib/analytics";

export interface ExperimentVariant {
  name: string;
  weight: number;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: ExperimentVariant[];
  is_active: boolean;
  traffic_allocation: number;
  start_date?: string;
  end_date?: string;
}

export interface VariantAssignment {
  experiment_id: string;
  visitor_id: string;
  session_id: string;
  variant_name: string;
  user_id?: string;
}

/**
 * Get or assign a variant for a user in an experiment
 * Uses consistent hashing to ensure the same user gets the same variant
 */
export async function getVariant(
  experimentName: string,
  visitorId: string,
  sessionId: string,
  userId?: string
): Promise<string | null> {
  try {
    // Fetch the experiment
    const { data: experiment, error: expError } = await supabase
      .from('experiments')
      .select('*')
      .eq('name', experimentName)
      .eq('is_active', true)
      .single();

    if (expError || !experiment) {
      console.error(`Experiment "${experimentName}" not found or inactive`);
      return null;
    }

    // Check if user is within traffic allocation
    const hash = simpleHash(`${visitorId}-${experimentName}`);
    const userAllocation = (hash % 100) / 100;
    
    if (userAllocation > experiment.traffic_allocation) {
      // User is not in the experiment
      return null;
    }

    // Check for existing assignment
    const { data: existingAssignment } = await supabase
      .from('variant_assignments')
      .select('variant_name')
      .eq('experiment_id', experiment.id)
      .eq('visitor_id', visitorId)
      .single();

    if (existingAssignment) {
      return existingAssignment.variant_name;
    }

    // Assign a new variant based on weights
    const variants = experiment.variants as unknown as ExperimentVariant[];
    const assignedVariant = weightedRandomChoice(variants, hash);

    // Store the assignment
    const { error: insertError } = await supabase
      .from('variant_assignments')
      .insert({
        experiment_id: experiment.id,
        visitor_id: visitorId,
        session_id: sessionId,
        variant_name: assignedVariant,
        user_id: userId,
      });

    if (insertError) {
      console.error('Error storing variant assignment:', insertError);
    }

    return assignedVariant;
  } catch (error) {
    console.error('Error in getVariant:', error);
    return null;
  }
}

/**
 * Simple hash function for consistent variant assignment
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Choose a variant based on weighted random selection
 */
function weightedRandomChoice(variants: ExperimentVariant[], seed: number): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = (seed % 1000) / 1000 * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant.name;
    }
  }

  return variants[0]?.name || 'control';
}

/**
 * Track an experiment event (conversion, interaction, etc.)
 */
export async function trackExperimentEvent(
  experimentName: string,
  variantName: string,
  eventName: string,
  metadata?: Record<string, any>
) {
  try {
    await trackAnalyticsEvent(`experiment_${eventName}`, {
      metadata: {
        experiment_name: experimentName,
        variant_name: variantName,
        ...metadata,
      },
    });
  } catch (error) {
    console.error('Error tracking experiment event:', error);
  }
}

/**
 * Get all active experiments
 */
export async function getActiveExperiments(): Promise<Experiment[]> {
  try {
    const { data, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching experiments:', error);
      return [];
    }

    return (data as unknown as Experiment[]) || [];
  } catch (error) {
    console.error('Error in getActiveExperiments:', error);
    return [];
  }
}
