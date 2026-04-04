-- ============================================================
-- Blacktop JC — Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── COURTS ──────────────────────────────────────────────────

CREATE TABLE courts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  neighborhood  TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  surface_type  TEXT,
  has_lighting  BOOLEAN DEFAULT false,
  is_indoor     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── USERS ───────────────────────────────────────────────────

CREATE TABLE users (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id                     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                TEXT NOT NULL,
  position                    TEXT[] DEFAULT '{}',
  neighborhood                TEXT,
  avatar_url                  TEXT,
  elo_rating                  INTEGER DEFAULT 1000,
  hooper_score_punctuality    NUMERIC(5,2) DEFAULT 0,
  hooper_score_sportsmanship  NUMERIC(5,2) DEFAULT 0,
  hooper_score_skill          NUMERIC(5,2) DEFAULT 0,
  total_games                 INTEGER DEFAULT 0,
  wins                        INTEGER DEFAULT 0,
  losses                      INTEGER DEFAULT 0,
  home_court_id               UUID REFERENCES courts(id),
  is_pro                      BOOLEAN DEFAULT false,
  expo_push_token             TEXT,
  womens_first_mode           BOOLEAN DEFAULT false,
  games_until_rated           INTEGER DEFAULT 3,
  noshow_warning              BOOLEAN DEFAULT false,
  created_at                  TIMESTAMPTZ DEFAULT now()
);

-- ─── COURT CONDITIONS ────────────────────────────────────────

CREATE TABLE court_conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id          UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  reported_by       UUID REFERENCES users(id),
  net_status        TEXT CHECK (net_status IN ('Up', 'Down', 'Torn')),
  surface_condition TEXT CHECK (surface_condition IN ('Dry', 'Wet', 'Damaged')),
  crowd_level       TEXT CHECK (crowd_level IN ('Empty', 'Light', 'Moderate', 'Packed')),
  photo_url         TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── COURT FAVORITES ─────────────────────────────────────────

CREATE TABLE court_favorites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id         UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  alert_threshold  INTEGER DEFAULT 4,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, court_id)
);

-- ─── COURT CHECK-INS ─────────────────────────────────────────

CREATE TABLE court_checkins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id   UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── GAMES ───────────────────────────────────────────────────

CREATE TABLE games (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id            UUID NOT NULL REFERENCES courts(id),
  host_id             UUID NOT NULL REFERENCES users(id),
  format              TEXT NOT NULL CHECK (format IN ('3v3', '5v5', '21', 'Open')),
  elo_band            TEXT NOT NULL CHECK (elo_band IN ('Unrated', 'Beginner', 'Intermediate', 'Advanced', 'Elite')),
  max_players         INTEGER NOT NULL DEFAULT 10 CHECK (max_players BETWEEN 4 AND 20),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  is_recurring        BOOLEAN DEFAULT false,
  recurrence_pattern  TEXT CHECK (recurrence_pattern IN ('weekly', 'biweekly')),
  status              TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'completed', 'cancelled')),
  description         TEXT,
  is_womens_only      BOOLEAN DEFAULT false,
  share_token         TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── GAME PLAYERS ────────────────────────────────────────────

CREATE TABLE game_players (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rsvp_status  TEXT DEFAULT 'in' CHECK (rsvp_status IN ('in', 'out', 'maybe')),
  joined_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_id, user_id)
);

-- ─── GAME RATINGS ────────────────────────────────────────────

CREATE TABLE game_ratings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rater_id              UUID NOT NULL REFERENCES users(id),
  rated_user_id         UUID NOT NULL REFERENCES users(id),
  skill_rating          INTEGER CHECK (skill_rating BETWEEN 1 AND 5),
  sportsmanship_rating  INTEGER CHECK (sportsmanship_rating BETWEEN 1 AND 5),
  punctuality_status    TEXT CHECK (punctuality_status IN ('ontime', 'late', 'noshow')),
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_id, rater_id, rated_user_id)
);

-- ─── GAME MESSAGES ───────────────────────────────────────────

CREATE TABLE game_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── PLAYER STATS ────────────────────────────────────────────

CREATE TABLE player_stats (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id   UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  points    INTEGER DEFAULT 0,
  assists   INTEGER DEFAULT 0,
  rebounds  INTEGER DEFAULT 0,
  steals    INTEGER DEFAULT 0,
  result    TEXT DEFAULT 'none' CHECK (result IN ('win', 'loss', 'none')),
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- ─── CREWS ───────────────────────────────────────────────────

CREATE TABLE crews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  color_hex     TEXT DEFAULT '#C9082A',
  home_court_id UUID REFERENCES courts(id),
  created_by    UUID NOT NULL REFERENCES users(id),
  rep_score     NUMERIC(5,2) DEFAULT 0,
  wins          INTEGER DEFAULT 0,
  losses        INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── CREW MEMBERS ────────────────────────────────────────────

CREATE TABLE crew_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id   UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (crew_id, user_id)
);

-- ─── CREW CHALLENGES ─────────────────────────────────────────

CREATE TABLE crew_challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_crew_id  UUID NOT NULL REFERENCES crews(id),
  challenged_crew_id  UUID NOT NULL REFERENCES crews(id),
  proposed_game_id    UUID REFERENCES games(id),
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── CREW MESSAGES ───────────────────────────────────────────

CREATE TABLE crew_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id    UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}',
  read         BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX idx_games_scheduled_at ON games(scheduled_at);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_court_id ON games(court_id);
CREATE INDEX idx_games_host_id ON games(host_id);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_ratings_game_id ON game_ratings(game_id);
CREATE INDEX idx_game_ratings_rated_user ON game_ratings(rated_user_id);
CREATE INDEX idx_game_messages_game_id ON game_messages(game_id);
CREATE INDEX idx_court_conditions_court_id ON court_conditions(court_id);
CREATE INDEX idx_court_checkins_court_id ON court_checkins(court_id);
CREATE INDEX idx_court_checkins_created_at ON court_checkins(created_at);
CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX idx_crew_messages_crew_id ON crew_messages(crew_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_player_stats_user_id ON player_stats(user_id);

-- ─── AUTO-CREATE USER PROFILE ON SIGNUP ──────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Hooper')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = auth_id);

-- Courts (public read)
CREATE POLICY "courts_select_all" ON courts FOR SELECT USING (true);
CREATE POLICY "courts_insert_auth" ON courts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Court conditions
CREATE POLICY "conditions_select_all" ON court_conditions FOR SELECT USING (true);
CREATE POLICY "conditions_insert_auth" ON court_conditions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Court favorites
CREATE POLICY "favorites_own" ON court_favorites FOR ALL USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Court checkins
CREATE POLICY "checkins_select_all" ON court_checkins FOR SELECT USING (true);
CREATE POLICY "checkins_insert_auth" ON court_checkins FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Games
CREATE POLICY "games_select_all" ON games FOR SELECT USING (true);
CREATE POLICY "games_insert_auth" ON games FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "games_update_host" ON games FOR UPDATE USING (
  host_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Game players
CREATE POLICY "game_players_select_all" ON game_players FOR SELECT USING (true);
CREATE POLICY "game_players_insert_auth" ON game_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "game_players_update_own" ON game_players FOR UPDATE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "game_players_delete_own" ON game_players FOR DELETE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Game ratings
CREATE POLICY "ratings_select_all" ON game_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_auth" ON game_ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Game messages
CREATE POLICY "messages_select_participants" ON game_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = game_messages.game_id
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);
CREATE POLICY "messages_insert_participants" ON game_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_players
    WHERE game_id = game_messages.game_id
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);

-- Player stats
CREATE POLICY "stats_select_all" ON player_stats FOR SELECT USING (true);
CREATE POLICY "stats_insert_own" ON player_stats FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Crews
CREATE POLICY "crews_select_all" ON crews FOR SELECT USING (true);
CREATE POLICY "crews_insert_auth" ON crews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "crews_update_admin" ON crews FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM crew_members
    WHERE crew_id = crews.id
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND role = 'admin'
  )
);

-- Crew members
CREATE POLICY "crew_members_select_all" ON crew_members FOR SELECT USING (true);
CREATE POLICY "crew_members_insert_auth" ON crew_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "crew_members_delete_own" ON crew_members FOR DELETE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Crew challenges
CREATE POLICY "challenges_select_all" ON crew_challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert_auth" ON crew_challenges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "challenges_update_involved" ON crew_challenges FOR UPDATE USING (
  challenger_crew_id IN (
    SELECT crew_id FROM crew_members
    WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND role = 'admin'
  )
  OR challenged_crew_id IN (
    SELECT crew_id FROM crew_members
    WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND role = 'admin'
  )
);

-- Crew messages
CREATE POLICY "crew_messages_select_members" ON crew_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM crew_members
    WHERE crew_id = crew_messages.crew_id
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);
CREATE POLICY "crew_messages_insert_members" ON crew_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM crew_members
    WHERE crew_id = crew_messages.crew_id
    AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
);

-- Notifications
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- ─── ENABLE REALTIME ─────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE court_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE crew_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
