-- Create A/B test experiment for puja carousel
INSERT INTO experiments (name, description, is_active, traffic_allocation, variants)
VALUES (
  'puja_carousel_test',
  'Test carousel vs static cards for puja recommendations',
  true,
  1.0,
  '[
    {"name": "control", "weight": 0.5},
    {"name": "carousel", "weight": 0.5}
  ]'::jsonb
);