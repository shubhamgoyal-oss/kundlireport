# A/B Testing Guide

This guide explains how to use the A/B testing system in your application.

## Overview

The A/B testing system allows you to:
- Define experiments with multiple variants
- Automatically assign users to variants
- Track experiment performance
- Analyze results through your analytics dashboard

## Quick Start

### 1. Create an Experiment

Insert an experiment into the `experiments` table:

```sql
INSERT INTO experiments (name, description, variants, is_active, traffic_allocation)
VALUES (
  'hero_cta_test',
  'Test different CTA button text on hero section',
  '[
    {"name": "control", "weight": 50},
    {"name": "variant_a", "weight": 50}
  ]'::jsonb,
  true,
  1.0
);
```

**Fields explained:**
- `name`: Unique identifier for the experiment
- `description`: What you're testing
- `variants`: Array of variant objects with names and weights (must sum to 100)
- `is_active`: Whether the experiment is running
- `traffic_allocation`: Percentage of users to include (0.0 to 1.0)

### 2. Use in Your Components

```tsx
import { useExperiment } from '@/hooks/useExperiment';

function HeroSection() {
  const { variant, isLoading, trackEvent } = useExperiment('hero_cta_test', 'control');

  if (isLoading) {
    return <Skeleton className="h-12 w-32" />;
  }

  const ctaText = variant === 'control' ? 'Get Started' : 'Try Now Free';

  return (
    <div>
      <h1>Welcome to Our App</h1>
      <button 
        onClick={() => {
          trackEvent('cta_clicked');
          // ... rest of click handler
        }}
      >
        {ctaText}
      </button>
    </div>
  );
}
```

### 3. Track Conversions

```tsx
// Track when a user completes a desired action
const handleSignup = async () => {
  await trackEvent('signup_completed', {
    plan: 'pro',
    amount: 29.99
  });
  
  // ... rest of signup logic
};
```

## Advanced Usage

### Multiple Variants

```sql
INSERT INTO experiments (name, variants, is_active)
VALUES (
  'pricing_page_layout',
  '[
    {"name": "control", "weight": 25},
    {"name": "variant_a", "weight": 25},
    {"name": "variant_b", "weight": 25},
    {"name": "variant_c", "weight": 25}
  ]'::jsonb,
  true
);
```

### Traffic Allocation

Test on only 20% of your traffic:

```sql
UPDATE experiments
SET traffic_allocation = 0.2
WHERE name = 'hero_cta_test';
```

### Time-Limited Experiments

```sql
UPDATE experiments
SET 
  start_date = NOW(),
  end_date = NOW() + INTERVAL '14 days'
WHERE name = 'hero_cta_test';
```

### Gradual Rollout

Start with 10% traffic, then increase:

```sql
-- Day 1: Start with 10%
UPDATE experiments SET traffic_allocation = 0.1 WHERE name = 'new_feature_test';

-- Day 3: Increase to 50%
UPDATE experiments SET traffic_allocation = 0.5 WHERE name = 'new_feature_test';

-- Day 7: Full rollout
UPDATE experiments SET traffic_allocation = 1.0 WHERE name = 'new_feature_test';
```

## Analyzing Results

### View Experiment Events

```sql
SELECT 
  metadata->>'experiment_name' as experiment,
  metadata->>'variant_name' as variant,
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT visitor_id) as unique_users
FROM analytics_events
WHERE event_name LIKE 'experiment_%'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
```

### Calculate Conversion Rates

```sql
WITH exposures AS (
  SELECT 
    metadata->>'variant_name' as variant,
    COUNT(DISTINCT visitor_id) as exposed_users
  FROM analytics_events
  WHERE event_name = 'experiment_exposed'
    AND metadata->>'experiment_name' = 'hero_cta_test'
  GROUP BY 1
),
conversions AS (
  SELECT 
    metadata->>'variant_name' as variant,
    COUNT(DISTINCT visitor_id) as converted_users
  FROM analytics_events
  WHERE event_name = 'experiment_signup_completed'
    AND metadata->>'experiment_name' = 'hero_cta_test'
  GROUP BY 1
)
SELECT 
  e.variant,
  e.exposed_users,
  COALESCE(c.converted_users, 0) as converted_users,
  ROUND(
    (COALESCE(c.converted_users, 0)::numeric / e.exposed_users * 100), 
    2
  ) as conversion_rate_pct
FROM exposures e
LEFT JOIN conversions c ON e.variant = c.variant
ORDER BY e.variant;
```

### View Current Assignments

```sql
SELECT 
  e.name as experiment,
  va.variant_name,
  COUNT(*) as users_assigned
FROM variant_assignments va
JOIN experiments e ON va.experiment_id = e.id
WHERE e.is_active = true
GROUP BY e.name, va.variant_name
ORDER BY e.name, va.variant_name;
```

## Best Practices

### 1. Statistical Significance
- Run experiments for at least 1-2 weeks
- Ensure you have enough traffic (minimum 100 conversions per variant)
- Use statistical significance calculators before concluding

### 2. Variant Assignment
- Users are consistently assigned to the same variant
- Assignment is based on visitor_id (persists across sessions)
- Use traffic_allocation to control exposure

### 3. Tracking
- Always track exposure events (automatic with useExperiment hook)
- Track all relevant conversion events
- Include metadata for deeper analysis

### 4. Experiment Hygiene
- Use descriptive experiment names
- Document what you're testing
- Set end dates to avoid running experiments indefinitely
- Deactivate experiments after concluding:

```sql
UPDATE experiments SET is_active = false WHERE name = 'hero_cta_test';
```

### 5. Avoid Common Pitfalls
- Don't peek at results too early (wait for significance)
- Don't run too many experiments simultaneously
- Don't change experiment configuration mid-flight
- Always have a clear hypothesis before testing

## Testing Multiple Elements

You can run multiple experiments simultaneously:

```tsx
function HomePage() {
  const heroCTA = useExperiment('hero_cta_test', 'control');
  const pricingLayout = useExperiment('pricing_layout_test', 'control');
  const colorScheme = useExperiment('color_scheme_test', 'control');

  // Use variants independently
  return (
    <>
      <Hero ctaVariant={heroCTA.variant} />
      <Pricing layoutVariant={pricingLayout.variant} />
      <Features colorVariant={colorScheme.variant} />
    </>
  );
}
```

## Troubleshooting

### Variant not assigning
- Check that experiment is active: `SELECT * FROM experiments WHERE name = 'your_experiment';`
- Verify visitor_id is being stored in localStorage
- Check browser console for errors

### Same variant every time
- This is expected! Users should see consistent variants
- Clear localStorage to get reassigned (for testing only)

### No data in analytics
- Ensure you're calling `trackEvent()` for conversions
- Check that analytics_events table is receiving data
- Verify event_name format is correct

## Example: Complete Experiment

```tsx
// Component: HeroCTA.tsx
import { useExperiment } from '@/hooks/useExperiment';
import { Button } from '@/components/ui/button';

export function HeroCTA() {
  const { variant, isLoading, trackEvent } = useExperiment(
    'hero_cta_test',
    'control'
  );

  if (isLoading) return <Button disabled>Loading...</Button>;

  const config = {
    control: {
      text: 'Get Started',
      color: 'primary'
    },
    variant_a: {
      text: 'Try Now Free',
      color: 'secondary'
    },
    variant_b: {
      text: 'Start Your Journey',
      color: 'accent'
    }
  };

  const { text, color } = config[variant as keyof typeof config] || config.control;

  return (
    <Button
      variant={color as any}
      onClick={async () => {
        trackEvent('cta_clicked');
        // Navigate or perform action
      }}
    >
      {text}
    </Button>
  );
}
```

## Need Help?

- Check the analytics_events table for tracked events
- Review the experiments table for active experiments
- Look at variant_assignments to see user assignments
- Check browser console for any errors
