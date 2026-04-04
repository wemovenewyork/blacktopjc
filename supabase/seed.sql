-- ============================================================
-- Blacktop JC — Seed Data
-- ============================================================

-- ─── COURTS ──────────────────────────────────────────────────

INSERT INTO courts (id, name, neighborhood, lat, lng, surface_type, has_lighting, is_indoor) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'West Side Park',              'West Side',          40.7178, -74.0776, 'asphalt',  true,  false),
  ('c0000001-0000-0000-0000-000000000002', 'Pershing Field',              'Journal Square',     40.7234, -74.0752, 'asphalt',  true,  false),
  ('c0000001-0000-0000-0000-000000000003', 'Pier 34 Basketball Court',    'Downtown',           40.7195, -74.0331, 'concrete', false, false),
  ('c0000001-0000-0000-0000-000000000004', 'General Nathanael Greene Park','Bergen-Lafayette',  40.7289, -74.0821, 'asphalt',  false, false),
  ('c0000001-0000-0000-0000-000000000005', 'Pavonia Marion Park',         'Pavonia',            40.7251, -74.0531, 'asphalt',  true,  false),
  ('c0000001-0000-0000-0000-000000000006', 'Jersey City Boys and Girls Club','Journal Square',  40.7187, -74.0712, 'hardwood', true,  true),
  ('c0000001-0000-0000-0000-000000000007', 'Hudson Evolution Basketball', 'Heights',            40.7298, -74.0643, 'hardwood', true,  true),
  ('c0000001-0000-0000-0000-000000000008', 'GRIT Sports Training',        'Greenville',         40.7156, -74.0689, 'hardwood', true,  true),
  ('c0000001-0000-0000-0000-000000000009', 'Canco Park',                  'Heights',            40.7321, -74.0698, 'asphalt',  false, false),
  ('c0000001-0000-0000-0000-000000000010', 'Berry Lane Park',             'Greenville',         40.7089, -74.0812, 'asphalt',  true,  false),
  ('c0000001-0000-0000-0000-000000000011', 'Lincoln Park',                'West Side',          40.7134, -74.0756, 'asphalt',  true,  false),
  ('c0000001-0000-0000-0000-000000000012', 'McGinley Square Park',        'McGinley Square',    40.7167, -74.0734, 'concrete', false, false),
  ('c0000001-0000-0000-0000-000000000013', 'Bayside Park',                'Bayonne border',     40.6967, -74.0756, 'asphalt',  false, false),
  ('c0000001-0000-0000-0000-000000000014', 'Roosevelt Stadium Courts',    'Journal Square',     40.7212, -74.0634, 'asphalt',  true,  false);

-- ─── SAMPLE USERS ────────────────────────────────────────────
-- Note: In production these would be linked to real auth.users rows.
-- For seed purposes, we insert with NULL auth_id (override trigger).

INSERT INTO users (id, auth_id, display_name, position, neighborhood, elo_rating, hooper_score_punctuality, hooper_score_sportsmanship, hooper_score_skill, total_games, wins, losses, home_court_id) VALUES
  ('u0000001-0000-0000-0000-000000000001', NULL, 'The General',  ARRAY['PG','SG'], 'Heights',          1456, 88, 91, 85, 47, 30, 17, 'c0000001-0000-0000-0000-000000000009'),
  ('u0000001-0000-0000-0000-000000000002', NULL, 'D-Money',      ARRAY['PG'],      'Downtown',         1234, 82, 79, 77, 28, 16, 12, 'c0000001-0000-0000-0000-000000000003'),
  ('u0000001-0000-0000-0000-000000000003', NULL, 'Rainmaker',    ARRAY['SF','PF'], 'Bergen-Lafayette', 987,  70, 75, 68, 12,  6,  6, 'c0000001-0000-0000-0000-000000000004'),
  ('u0000001-0000-0000-0000-000000000004', NULL, 'Buckets',      ARRAY['SG','SF'], 'Journal Square',   1123, 91, 88, 80, 35, 20, 15, 'c0000001-0000-0000-0000-000000000002'),
  ('u0000001-0000-0000-0000-000000000005', NULL, 'Big D',        ARRAY['C','PF'],  'West Side',        1612, 95, 93, 88, 62, 42, 20, 'c0000001-0000-0000-0000-000000000001');

-- ─── SAMPLE GAMES ────────────────────────────────────────────

INSERT INTO games (id, court_id, host_id, format, elo_band, max_players, scheduled_at, status, description) VALUES
  ('g0000001-0000-0000-0000-000000000001',
   'c0000001-0000-0000-0000-000000000001',
   'u0000001-0000-0000-0000-000000000005',
   '5v5', 'Intermediate', 10,
   NOW() + INTERVAL '2 days',
   'open',
   'West Side classic 5s. Good vibes only. We run all day.'),

  ('g0000001-0000-0000-0000-000000000002',
   'c0000001-0000-0000-0000-000000000002',
   'u0000001-0000-0000-0000-000000000004',
   '3v3', 'Beginner', 6,
   NOW() + INTERVAL '1 day',
   'open',
   'Come learn the game. All skill levels welcome. Bring water.'),

  ('g0000001-0000-0000-0000-000000000003',
   'c0000001-0000-0000-0000-000000000003',
   'u0000001-0000-0000-0000-000000000001',
   '21', 'Advanced', 8,
   NOW() + INTERVAL '3 days',
   'open',
   'Pier 34 got the best courts in JC. Advanced players only — come ready to work.');

-- ─── SAMPLE GAME PLAYERS ─────────────────────────────────────

-- Game 1 (West Side 5v5)
INSERT INTO game_players (game_id, user_id, rsvp_status) VALUES
  ('g0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000005', 'in'),
  ('g0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000001', 'in'),
  ('g0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000003', 'maybe');

-- Game 2 (Pershing 3v3)
INSERT INTO game_players (game_id, user_id, rsvp_status) VALUES
  ('g0000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000004', 'in'),
  ('g0000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000002', 'in');

-- Game 3 (Pier 34 21)
INSERT INTO game_players (game_id, user_id, rsvp_status) VALUES
  ('g0000001-0000-0000-0000-000000000003', 'u0000001-0000-0000-0000-000000000001', 'in'),
  ('g0000001-0000-0000-0000-000000000003', 'u0000001-0000-0000-0000-000000000002', 'in'),
  ('g0000001-0000-0000-0000-000000000003', 'u0000001-0000-0000-0000-000000000005', 'maybe');

-- ─── SAMPLE CREWS ────────────────────────────────────────────

INSERT INTO crews (id, name, color_hex, home_court_id, created_by, rep_score, wins, losses) VALUES
  ('cr000001-0000-0000-0000-000000000001',
   'Heights Crew', '#C9082A',
   'c0000001-0000-0000-0000-000000000009',
   'u0000001-0000-0000-0000-000000000001',
   88.5, 22, 8),

  ('cr000001-0000-0000-0000-000000000002',
   'Downtown Squad', '#C8A94A',
   'c0000001-0000-0000-0000-000000000003',
   'u0000001-0000-0000-0000-000000000002',
   81.0, 15, 10);

-- ─── CREW MEMBERS ────────────────────────────────────────────

-- Heights Crew
INSERT INTO crew_members (crew_id, user_id, role) VALUES
  ('cr000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000001', 'admin'),
  ('cr000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000003', 'member'),
  ('cr000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000005', 'member');

-- Downtown Squad
INSERT INTO crew_members (crew_id, user_id, role) VALUES
  ('cr000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000002', 'admin'),
  ('cr000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000004', 'member');

-- ─── SAMPLE COURT CONDITIONS ─────────────────────────────────

INSERT INTO court_conditions (court_id, reported_by, net_status, surface_condition, crowd_level) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000005', 'Up', 'Dry', 'Light'),
  ('c0000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000004', 'Up', 'Dry', 'Empty'),
  ('c0000001-0000-0000-0000-000000000003', 'u0000001-0000-0000-0000-000000000001', 'Down', 'Dry', 'Moderate');
