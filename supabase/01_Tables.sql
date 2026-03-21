-- ============================================================
-- ClinkerGA — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================


-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE presets (
  name        TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE production_units (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preset      TEXT,
  name        TEXT,
  city        TEXT,
  capacity    FLOAT,
  description TEXT
);

CREATE TABLE grinding_units (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preset      TEXT,
  name        TEXT,
  city        TEXT,
  demand      FLOAT,
  description TEXT
);

CREATE TABLE routes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preset          TEXT,
  pu_id           UUID,
  gu_id           UUID,
  name            TEXT,
  cost_per_tonne  FLOAT,
  fixed_trip_cost FLOAT DEFAULT 0,
  max_capacity    FLOAT,
  description     TEXT
);

CREATE TABLE results (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at       TIMESTAMP DEFAULT now(),
  preset       TEXT,
  ga_params    JSONB,
  total_cost   FLOAT,
  best_fitness FLOAT,
  convergence  JSONB,
  allocations  JSONB,
  everything   JSONB
);


-- ── RLS (enabled, no policies = service role only until you add them) ──

ALTER TABLE presets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE grinding_units   ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE results          ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (open for now, tighten later)
CREATE POLICY "public_all" ON presets          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON production_units FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON grinding_units   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON routes           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON results          FOR ALL TO anon USING (true) WITH CHECK (true);


-- ============================================================
-- SEED DATA
-- ============================================================


-- ── Presets ──────────────────────────────────────────────────

INSERT INTO presets (name, description) VALUES
  ('small_4x4',   'Small scenario — 4 production units, 4 grinding units. Good for learning and testing GA params.'),
  ('medium_8x8',  'Medium scenario — 8 production units, 8 grinding units. Moderate complexity.'),
  ('full_15x15',  'Full scenario — 15 production units, 15 grinding units. Real-scale India cement supply chain.');


-- ============================================================
-- PRESET: small_4x4
-- ============================================================

-- Production units
WITH pu AS (
  INSERT INTO production_units (preset, name, city, capacity, description) VALUES
    ('small_4x4', 'Nimbahera Plant',   'Nimbahera, Rajasthan',  3200, 'Large integrated plant in Rajasthan limestone belt'),
    ('small_4x4', 'Maihar Plant',      'Maihar, MP',            3000, 'Central India plant with rail connectivity'),
    ('small_4x4', 'Yerraguntla Plant', 'Yerraguntla, AP',       3500, 'South India high-capacity plant'),
    ('small_4x4', 'Wadi Plant',        'Wadi, Karnataka',       2900, 'Karnataka plant near Gulbarga')
  RETURNING id, name
),

-- Grinding units
gu AS (
  INSERT INTO grinding_units (preset, name, city, demand, description) VALUES
    ('small_4x4', 'Delhi GU',     'Delhi',          1800, 'High demand northern market'),
    ('small_4x4', 'Mumbai GU',    'Mumbai, MH',     2200, 'Largest demand grinding unit'),
    ('small_4x4', 'Bengaluru GU', 'Bengaluru, KA',  2100, 'South India key market'),
    ('small_4x4', 'Kolkata GU',   'Kolkata, WB',    2000, 'East India market')
  RETURNING id, name
)

-- Routes: insert after units exist, so we do a second step below
SELECT 1;

-- Routes for small_4x4 (inserted referencing IDs via subquery)
INSERT INTO routes (preset, pu_id, gu_id, name, cost_per_tonne, fixed_trip_cost, max_capacity, description)
SELECT
  'small_4x4',
  pu.id,
  gu.id,
  pu.name || ' → ' || gu.name || ' (' || route_info.mode || ')',
  route_info.cost_per_tonne,
  route_info.fixed_trip_cost,
  route_info.max_capacity,
  route_info.mode || ' route'
FROM
  production_units pu,
  grinding_units gu,
  (VALUES
    ('Nimbahera Plant', 'Delhi GU',     'Road',  2.1,  5000, 800),
    ('Nimbahera Plant', 'Delhi GU',     'Rail',  1.3,  8000, 2000),
    ('Nimbahera Plant', 'Mumbai GU',    'Road',  3.2,  5000, 600),
    ('Nimbahera Plant', 'Mumbai GU',    'Rail',  1.8,  8000, 1800),
    ('Nimbahera Plant', 'Bengaluru GU', 'Rail',  2.4,  8000, 1500),
    ('Nimbahera Plant', 'Kolkata GU',   'Rail',  2.0,  8000, 1600),
    ('Maihar Plant',    'Delhi GU',     'Rail',  1.1,  8000, 2000),
    ('Maihar Plant',    'Delhi GU',     'Road',  1.9,  5000, 700),
    ('Maihar Plant',    'Mumbai GU',    'Rail',  1.6,  8000, 1800),
    ('Maihar Plant',    'Bengaluru GU', 'Rail',  2.2,  8000, 1500),
    ('Maihar Plant',    'Kolkata GU',   'Rail',  1.4,  8000, 1800),
    ('Maihar Plant',    'Kolkata GU',   'Road',  2.3,  5000, 500),
    ('Yerraguntla Plant', 'Delhi GU',   'Rail',  2.8,  8000, 1200),
    ('Yerraguntla Plant', 'Mumbai GU',  'Rail',  2.0,  8000, 1800),
    ('Yerraguntla Plant', 'Mumbai GU',  'Road',  3.5,  5000, 600),
    ('Yerraguntla Plant', 'Bengaluru GU', 'Road',1.2,  5000, 1200),
    ('Yerraguntla Plant', 'Bengaluru GU', 'Rail',0.9,  8000, 2000),
    ('Yerraguntla Plant', 'Kolkata GU', 'Rail',  2.6,  8000, 1000),
    ('Wadi Plant',      'Delhi GU',     'Rail',  2.5,  8000, 1200),
    ('Wadi Plant',      'Mumbai GU',    'Road',  1.8,  5000, 900),
    ('Wadi Plant',      'Mumbai GU',    'Rail',  1.1,  8000, 2000),
    ('Wadi Plant',      'Bengaluru GU', 'Road',  1.5,  5000, 1000),
    ('Wadi Plant',      'Bengaluru GU', 'Rail',  1.0,  8000, 2000),
    ('Wadi Plant',      'Kolkata GU',   'Rail',  2.3,  8000, 1000)
  ) AS route_info(pu_name, gu_name, mode, cost_per_tonne, fixed_trip_cost, max_capacity)
WHERE
  pu.preset = 'small_4x4' AND pu.name = route_info.pu_name
  AND gu.preset = 'small_4x4' AND gu.name = route_info.gu_name;


-- ============================================================
-- PRESET: medium_8x8
-- ============================================================

INSERT INTO production_units (preset, name, city, capacity, description) VALUES
  ('medium_8x8', 'Nimbahera Plant',   'Nimbahera, Rajasthan',  3200, 'Large integrated plant in Rajasthan limestone belt'),
  ('medium_8x8', 'Chanderia Plant',   'Chanderia, Rajasthan',  2800, 'Second Rajasthan plant, close to Nimbahera'),
  ('medium_8x8', 'Maihar Plant',      'Maihar, MP',            3000, 'Central India plant with rail connectivity'),
  ('medium_8x8', 'Satna Plant',       'Satna, MP',             2700, 'MP cluster plant near Maihar'),
  ('medium_8x8', 'Yerraguntla Plant', 'Yerraguntla, AP',       3500, 'South India high-capacity plant'),
  ('medium_8x8', 'Wadi Plant',        'Wadi, Karnataka',       2900, 'Karnataka plant near Gulbarga'),
  ('medium_8x8', 'Surat Plant',       'Surat, Gujarat',        2400, 'West coast plant with port access'),
  ('medium_8x8', 'Bilaspur Plant',    'Bilaspur, CG',          2300, 'Chhattisgarh plant, central-east connectivity');

INSERT INTO grinding_units (preset, name, city, demand, description) VALUES
  ('medium_8x8', 'Delhi GU',       'Delhi',           1800, 'High demand northern market'),
  ('medium_8x8', 'Jaipur GU',      'Jaipur, RJ',      1500, 'Rajasthan grinding hub'),
  ('medium_8x8', 'Mumbai GU',      'Mumbai, MH',      2200, 'Largest demand grinding unit'),
  ('medium_8x8', 'Pune GU',        'Pune, MH',        1700, 'Maharashtra secondary market'),
  ('medium_8x8', 'Hyderabad GU',   'Hyderabad, TS',   2000, 'Telangana market'),
  ('medium_8x8', 'Bengaluru GU',   'Bengaluru, KA',   2100, 'South India key market'),
  ('medium_8x8', 'Kolkata GU',     'Kolkata, WB',     2000, 'East India market'),
  ('medium_8x8', 'Ahmedabad GU',   'Ahmedabad, GJ',   1800, 'Gujarat market');

INSERT INTO routes (preset, pu_id, gu_id, name, cost_per_tonne, fixed_trip_cost, max_capacity, description)
SELECT
  'medium_8x8',
  pu.id,
  gu.id,
  pu.name || ' → ' || gu.name || ' (' || route_info.mode || ')',
  route_info.cost_per_tonne,
  route_info.fixed_trip_cost,
  route_info.max_capacity,
  route_info.mode || ' route'
FROM
  production_units pu,
  grinding_units gu,
  (VALUES
    ('Nimbahera Plant', 'Delhi GU',     'Road', 2.1,  5000, 800),
    ('Nimbahera Plant', 'Delhi GU',     'Rail', 1.3,  8000, 2000),
    ('Nimbahera Plant', 'Jaipur GU',    'Road', 1.4,  5000, 1000),
    ('Nimbahera Plant', 'Mumbai GU',    'Rail', 1.8,  8000, 1800),
    ('Nimbahera Plant', 'Ahmedabad GU', 'Road', 1.9,  5000, 900),
    ('Chanderia Plant', 'Delhi GU',     'Road', 2.0,  5000, 800),
    ('Chanderia Plant', 'Jaipur GU',    'Road', 1.3,  5000, 1000),
    ('Chanderia Plant', 'Jaipur GU',    'Rail', 0.9,  8000, 1800),
    ('Chanderia Plant', 'Ahmedabad GU', 'Rail', 1.6,  8000, 1500),
    ('Maihar Plant',    'Delhi GU',     'Rail', 1.1,  8000, 2000),
    ('Maihar Plant',    'Kolkata GU',   'Rail', 1.4,  8000, 1800),
    ('Maihar Plant',    'Hyderabad GU', 'Rail', 1.9,  8000, 1500),
    ('Satna Plant',     'Delhi GU',     'Rail', 1.2,  8000, 1800),
    ('Satna Plant',     'Kolkata GU',   'Rail', 1.5,  8000, 1600),
    ('Satna Plant',     'Hyderabad GU', 'Rail', 2.0,  8000, 1400),
    ('Yerraguntla Plant','Hyderabad GU','Road', 1.0,  5000, 1500),
    ('Yerraguntla Plant','Hyderabad GU','Rail', 0.7,  8000, 2500),
    ('Yerraguntla Plant','Bengaluru GU','Road', 1.2,  5000, 1200),
    ('Yerraguntla Plant','Bengaluru GU','Rail', 0.9,  8000, 2000),
    ('Yerraguntla Plant','Mumbai GU',   'Rail', 2.0,  8000, 1800),
    ('Wadi Plant',      'Mumbai GU',    'Rail', 1.1,  8000, 2000),
    ('Wadi Plant',      'Pune GU',      'Road', 1.3,  5000, 1200),
    ('Wadi Plant',      'Hyderabad GU', 'Road', 1.4,  5000, 1000),
    ('Wadi Plant',      'Bengaluru GU', 'Rail', 1.0,  8000, 2000),
    ('Surat Plant',     'Mumbai GU',    'Road', 1.2,  5000, 1500),
    ('Surat Plant',     'Ahmedabad GU', 'Road', 0.8,  5000, 1800),
    ('Surat Plant',     'Pune GU',      'Road', 1.6,  5000, 1000),
    ('Bilaspur Plant',  'Kolkata GU',   'Rail', 1.6,  8000, 1500),
    ('Bilaspur Plant',  'Hyderabad GU', 'Rail', 2.1,  8000, 1200),
    ('Bilaspur Plant',  'Delhi GU',     'Rail', 1.8,  8000, 1400)
  ) AS route_info(pu_name, gu_name, mode, cost_per_tonne, fixed_trip_cost, max_capacity)
WHERE
  pu.preset = 'medium_8x8' AND pu.name = route_info.pu_name
  AND gu.preset = 'medium_8x8' AND gu.name = route_info.gu_name;


-- ============================================================
-- PRESET: full_15x15
-- ============================================================

INSERT INTO production_units (preset, name, city, capacity, description) VALUES
  ('full_15x15', 'Nimbahera Plant',    'Nimbahera, Rajasthan',  3200, 'Large integrated plant in Rajasthan limestone belt'),
  ('full_15x15', 'Chanderia Plant',    'Chanderia, Rajasthan',  2800, 'Second Rajasthan plant'),
  ('full_15x15', 'Chittorgarh Plant',  'Chittorgarh, Rajasthan',2500, 'Rajasthan cluster third plant'),
  ('full_15x15', 'Maihar Plant',       'Maihar, MP',            3000, 'Central India plant with rail connectivity'),
  ('full_15x15', 'Satna Plant',        'Satna, MP',             2700, 'MP cluster plant'),
  ('full_15x15', 'Rewa Plant',         'Rewa, MP',              2200, 'MP eastern plant'),
  ('full_15x15', 'Yerraguntla Plant',  'Yerraguntla, AP',       3500, 'South India high-capacity plant'),
  ('full_15x15', 'Gulbarga Plant',     'Gulbarga, Karnataka',   3100, 'North Karnataka plant'),
  ('full_15x15', 'Wadi Plant',         'Wadi, Karnataka',       2900, 'Karnataka plant near Gulbarga'),
  ('full_15x15', 'Ariyalur Plant',     'Ariyalur, Tamil Nadu',  2600, 'Tamil Nadu plant'),
  ('full_15x15', 'Bokaro Plant',       'Bokaro, Jharkhand',     2000, 'East India plant'),
  ('full_15x15', 'Durgapur Plant',     'Durgapur, West Bengal', 1800, 'West Bengal plant'),
  ('full_15x15', 'Surat Plant',        'Surat, Gujarat',        2400, 'West coast plant with port access'),
  ('full_15x15', 'Ratnagiri Plant',    'Ratnagiri, Maharashtra',2100, 'Maharashtra coastal plant'),
  ('full_15x15', 'Bilaspur Plant',     'Bilaspur, CG',          2300, 'Chhattisgarh plant');

INSERT INTO grinding_units (preset, name, city, demand, description) VALUES
  ('full_15x15', 'Delhi GU',       'Delhi',           1800, 'High demand northern market'),
  ('full_15x15', 'Jaipur GU',      'Jaipur, RJ',      1500, 'Rajasthan grinding hub'),
  ('full_15x15', 'Indore GU',      'Indore, MP',      1600, 'MP western market'),
  ('full_15x15', 'Nagpur GU',      'Nagpur, MH',      1400, 'Central Maharashtra market'),
  ('full_15x15', 'Mumbai GU',      'Mumbai, MH',      2200, 'Largest demand grinding unit'),
  ('full_15x15', 'Pune GU',        'Pune, MH',        1700, 'Maharashtra secondary market'),
  ('full_15x15', 'Hyderabad GU',   'Hyderabad, TS',   2000, 'Telangana market'),
  ('full_15x15', 'Bengaluru GU',   'Bengaluru, KA',   2100, 'South India key market'),
  ('full_15x15', 'Chennai GU',     'Chennai, TN',     1900, 'Tamil Nadu market'),
  ('full_15x15', 'Kolkata GU',     'Kolkata, WB',     2000, 'East India market'),
  ('full_15x15', 'Bhubaneswar GU', 'Bhubaneswar, OD', 1200, 'Odisha market'),
  ('full_15x15', 'Patna GU',       'Patna, BR',       1300, 'Bihar market'),
  ('full_15x15', 'Lucknow GU',     'Lucknow, UP',     1500, 'UP market'),
  ('full_15x15', 'Ahmedabad GU',   'Ahmedabad, GJ',   1800, 'Gujarat market'),
  ('full_15x15', 'Raipur GU',      'Raipur, CG',      1100, 'Chhattisgarh market');

INSERT INTO routes (preset, pu_id, gu_id, name, cost_per_tonne, fixed_trip_cost, max_capacity, description)
SELECT
  'full_15x15',
  pu.id,
  gu.id,
  pu.name || ' → ' || gu.name || ' (' || route_info.mode || ')',
  route_info.cost_per_tonne,
  route_info.fixed_trip_cost,
  route_info.max_capacity,
  route_info.mode || ' route'
FROM
  production_units pu,
  grinding_units gu,
  (VALUES
    -- Nimbahera
    ('Nimbahera Plant', 'Delhi GU',     'Road', 2.1, 5000, 800),
    ('Nimbahera Plant', 'Delhi GU',     'Rail', 1.3, 8000, 2000),
    ('Nimbahera Plant', 'Jaipur GU',    'Road', 1.4, 5000, 1200),
    ('Nimbahera Plant', 'Jaipur GU',    'Rail', 1.0, 8000, 1800),
    ('Nimbahera Plant', 'Ahmedabad GU', 'Rail', 1.7, 8000, 1500),
    ('Nimbahera Plant', 'Indore GU',    'Road', 1.8, 5000, 900),
    -- Chanderia
    ('Chanderia Plant', 'Delhi GU',     'Road', 2.0, 5000, 800),
    ('Chanderia Plant', 'Jaipur GU',    'Road', 1.3, 5000, 1000),
    ('Chanderia Plant', 'Jaipur GU',    'Rail', 0.9, 8000, 1800),
    ('Chanderia Plant', 'Ahmedabad GU', 'Rail', 1.6, 8000, 1500),
    ('Chanderia Plant', 'Indore GU',    'Road', 1.7, 5000, 800),
    -- Chittorgarh
    ('Chittorgarh Plant','Jaipur GU',   'Road', 1.2, 5000, 1000),
    ('Chittorgarh Plant','Delhi GU',    'Rail', 1.5, 8000, 1500),
    ('Chittorgarh Plant','Ahmedabad GU','Road', 1.8, 5000, 900),
    ('Chittorgarh Plant','Mumbai GU',   'Rail', 2.0, 8000, 1200),
    -- Maihar
    ('Maihar Plant',    'Delhi GU',     'Rail', 1.1, 8000, 2000),
    ('Maihar Plant',    'Lucknow GU',   'Rail', 1.2, 8000, 1500),
    ('Maihar Plant',    'Kolkata GU',   'Rail', 1.4, 8000, 1800),
    ('Maihar Plant',    'Hyderabad GU', 'Rail', 1.9, 8000, 1500),
    ('Maihar Plant',    'Nagpur GU',    'Road', 1.6, 5000, 900),
    ('Maihar Plant',    'Raipur GU',    'Road', 1.3, 5000, 1000),
    -- Satna
    ('Satna Plant',     'Delhi GU',     'Rail', 1.2, 8000, 1800),
    ('Satna Plant',     'Lucknow GU',   'Rail', 1.1, 8000, 1500),
    ('Satna Plant',     'Patna GU',     'Rail', 1.3, 8000, 1200),
    ('Satna Plant',     'Kolkata GU',   'Rail', 1.5, 8000, 1600),
    ('Satna Plant',     'Raipur GU',    'Road', 1.4, 5000, 900),
    -- Rewa
    ('Rewa Plant',      'Lucknow GU',   'Rail', 1.2, 8000, 1200),
    ('Rewa Plant',      'Patna GU',     'Rail', 1.4, 8000, 1000),
    ('Rewa Plant',      'Kolkata GU',   'Rail', 1.6, 8000, 1200),
    ('Rewa Plant',      'Raipur GU',    'Road', 1.1, 5000, 800),
    -- Yerraguntla
    ('Yerraguntla Plant','Hyderabad GU','Rail', 0.7, 8000, 2500),
    ('Yerraguntla Plant','Hyderabad GU','Road', 1.0, 5000, 1500),
    ('Yerraguntla Plant','Bengaluru GU','Rail', 0.9, 8000, 2000),
    ('Yerraguntla Plant','Bengaluru GU','Road', 1.2, 5000, 1200),
    ('Yerraguntla Plant','Chennai GU',  'Rail', 1.1, 8000, 1800),
    ('Yerraguntla Plant','Mumbai GU',   'Rail', 2.0, 8000, 1500),
    -- Gulbarga
    ('Gulbarga Plant',  'Hyderabad GU', 'Road', 1.1, 5000, 1500),
    ('Gulbarga Plant',  'Hyderabad GU', 'Rail', 0.8, 8000, 2000),
    ('Gulbarga Plant',  'Bengaluru GU', 'Rail', 1.0, 8000, 1800),
    ('Gulbarga Plant',  'Mumbai GU',    'Rail', 1.3, 8000, 1800),
    ('Gulbarga Plant',  'Pune GU',      'Road', 1.5, 5000, 1000),
    -- Wadi
    ('Wadi Plant',      'Mumbai GU',    'Rail', 1.1, 8000, 2000),
    ('Wadi Plant',      'Pune GU',      'Road', 1.3, 5000, 1200),
    ('Wadi Plant',      'Hyderabad GU', 'Road', 1.4, 5000, 1000),
    ('Wadi Plant',      'Bengaluru GU', 'Rail', 1.0, 8000, 2000),
    ('Wadi Plant',      'Nagpur GU',    'Road', 1.8, 5000, 800),
    -- Ariyalur
    ('Ariyalur Plant',  'Chennai GU',   'Road', 0.9, 5000, 1800),
    ('Ariyalur Plant',  'Chennai GU',   'Rail', 0.6, 8000, 2500),
    ('Ariyalur Plant',  'Bengaluru GU', 'Rail', 1.2, 8000, 1500),
    ('Ariyalur Plant',  'Hyderabad GU', 'Rail', 1.5, 8000, 1200),
    -- Bokaro
    ('Bokaro Plant',    'Kolkata GU',   'Rail', 0.8, 8000, 1800),
    ('Bokaro Plant',    'Patna GU',     'Rail', 0.9, 8000, 1200),
    ('Bokaro Plant',    'Bhubaneswar GU','Rail',1.1, 8000, 1000),
    ('Bokaro Plant',    'Delhi GU',     'Rail', 1.6, 8000, 1200),
    -- Durgapur
    ('Durgapur Plant',  'Kolkata GU',   'Road', 0.7, 5000, 1600),
    ('Durgapur Plant',  'Kolkata GU',   'Rail', 0.5, 8000, 2000),
    ('Durgapur Plant',  'Bhubaneswar GU','Rail',1.2, 8000, 1000),
    ('Durgapur Plant',  'Patna GU',     'Rail', 1.0, 8000, 1000),
    -- Surat
    ('Surat Plant',     'Mumbai GU',    'Road', 1.2, 5000, 1500),
    ('Surat Plant',     'Ahmedabad GU', 'Road', 0.8, 5000, 1800),
    ('Surat Plant',     'Pune GU',      'Road', 1.6, 5000, 1000),
    ('Surat Plant',     'Nagpur GU',    'Rail', 1.9, 8000, 900),
    -- Ratnagiri
    ('Ratnagiri Plant', 'Mumbai GU',    'Road', 1.4, 5000, 1200),
    ('Ratnagiri Plant', 'Pune GU',      'Road', 1.5, 5000, 1000),
    ('Ratnagiri Plant', 'Bengaluru GU', 'Rail', 2.0, 8000, 800),
    -- Bilaspur
    ('Bilaspur Plant',  'Raipur GU',    'Road', 0.6, 5000, 1200),
    ('Bilaspur Plant',  'Nagpur GU',    'Road', 1.2, 5000, 900),
    ('Bilaspur Plant',  'Kolkata GU',   'Rail', 1.6, 8000, 1500),
    ('Bilaspur Plant',  'Hyderabad GU', 'Rail', 2.1, 8000, 1200),
    ('Bilaspur Plant',  'Bhubaneswar GU','Rail',1.4, 8000, 1000)
  ) AS route_info(pu_name, gu_name, mode, cost_per_tonne, fixed_trip_cost, max_capacity)
WHERE
  pu.preset = 'full_15x15' AND pu.name = route_info.pu_name
  AND gu.preset = 'full_15x15' AND gu.name = route_info.gu_name;