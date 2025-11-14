--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: set_calculation_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_calculation_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.calculation_number := COALESCE(
    (SELECT MAX(calculation_number) + 1 
     FROM public.dosha_calculations 
     WHERE visitor_id = NEW.visitor_id),
    1
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    page text,
    step integer,
    puja_id integer,
    puja_name text,
    metadata jsonb,
    session_id text NOT NULL,
    visitor_id text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dosha_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dosha_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    visitor_id text NOT NULL,
    session_id text NOT NULL,
    calculation_number integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    date_of_birth date NOT NULL,
    time_of_birth time without time zone NOT NULL,
    place_of_birth text NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    mangal_dosha boolean DEFAULT false NOT NULL,
    kaal_sarp_dosha boolean DEFAULT false NOT NULL,
    pitra_dosha boolean DEFAULT false NOT NULL,
    sade_sati boolean DEFAULT false NOT NULL,
    grahan_dosha boolean DEFAULT false NOT NULL,
    shrapit_dosha boolean DEFAULT false NOT NULL,
    guru_chandal_dosha boolean DEFAULT false NOT NULL,
    punarphoo_dosha boolean DEFAULT false NOT NULL,
    kemadruma_yoga boolean DEFAULT false NOT NULL,
    gandmool_dosha boolean DEFAULT false NOT NULL,
    kalathra_dosha boolean DEFAULT false NOT NULL,
    vish_daridra_yoga boolean DEFAULT false NOT NULL,
    ketu_naga_dosha boolean DEFAULT false NOT NULL,
    navagraha_umbrella boolean DEFAULT false NOT NULL,
    calculation_results jsonb,
    book_puja_clicked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: dosha_calculations dosha_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dosha_calculations
    ADD CONSTRAINT dosha_calculations_pkey PRIMARY KEY (id);


--
-- Name: idx_analytics_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_created_at ON public.analytics_events USING btree (created_at DESC);


--
-- Name: idx_analytics_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_session_id ON public.analytics_events USING btree (session_id);


--
-- Name: idx_analytics_events_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_events_visitor_id ON public.analytics_events USING btree (visitor_id);


--
-- Name: idx_dosha_calculations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dosha_calculations_created_at ON public.dosha_calculations USING btree (created_at DESC);


--
-- Name: idx_dosha_calculations_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dosha_calculations_session_id ON public.dosha_calculations USING btree (session_id);


--
-- Name: idx_dosha_calculations_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dosha_calculations_visitor_id ON public.dosha_calculations USING btree (visitor_id);


--
-- Name: dosha_calculations set_calculation_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_calculation_number_trigger BEFORE INSERT ON public.dosha_calculations FOR EACH ROW EXECUTE FUNCTION public.set_calculation_number();


--
-- Name: dosha_calculations update_dosha_calculations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dosha_calculations_updated_at BEFORE UPDATE ON public.dosha_calculations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: analytics_events Anyone can insert analytics events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);


--
-- Name: dosha_calculations Anyone can insert calculations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert calculations" ON public.dosha_calculations FOR INSERT WITH CHECK (true);


--
-- Name: dosha_calculations Anyone can insert dosha calculations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert dosha calculations" ON public.dosha_calculations FOR INSERT WITH CHECK (true);


--
-- Name: analytics_events Authenticated users view own events only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users view own events only" ON public.analytics_events FOR SELECT TO authenticated USING (((auth.uid() = user_id) AND (user_id IS NOT NULL)));


--
-- Name: dosha_calculations Users can update their own calculations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own calculations" ON public.dosha_calculations FOR UPDATE USING (((user_id IS NULL) OR (auth.uid() = user_id)));


--
-- Name: dosha_calculations Users can view their own calculations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own calculations" ON public.dosha_calculations FOR SELECT USING (((user_id IS NULL) OR (auth.uid() = user_id)));


--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: dosha_calculations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dosha_calculations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


