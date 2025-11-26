-- Fix security definer view issue by dropping the views
-- These views expose analytics data without proper access control
-- They can be recreated when admin authentication is implemented

DROP VIEW IF EXISTS daily_data_secure CASCADE;
DROP VIEW IF EXISTS daily_data CASCADE;