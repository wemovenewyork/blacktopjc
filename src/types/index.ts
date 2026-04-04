// ─── Enums ─────────────────────────────────────────────────────────────────

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'Multiple';
export type Format = '3v3' | '5v5' | '21' | 'Open';
export type EloBand = 'Unrated' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
export type EloTier = 'Unrated' | 'Rookie' | 'Starter' | 'All-Star' | 'MVP' | 'Legend';
export type GameStatus = 'open' | 'full' | 'completed' | 'cancelled';
export type RsvpStatus = 'in' | 'out' | 'maybe';
export type NetStatus = 'Up' | 'Down' | 'Torn';
export type SurfaceCondition = 'Dry' | 'Wet' | 'Damaged';
export type CrowdLevel = 'Empty' | 'Light' | 'Moderate' | 'Packed';
export type PunctualityStatus = 'ontime' | 'late' | 'noshow';
export type CrewRole = 'admin' | 'member';
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type GameResult = 'win' | 'loss' | 'none';
export type RecurrencePattern = 'weekly' | 'biweekly';
export type NotificationType =
  | 'game_filling_up'
  | 'game_reminder'
  | 'court_activity'
  | 'crew_challenge'
  | 'post_game_rating'
  | 'player_joined';

// ─── Core Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  auth_id: string;
  display_name: string;
  position: Position[];
  neighborhood: string;
  avatar_url: string | null;
  elo_rating: number;
  hooper_score_punctuality: number;
  hooper_score_sportsmanship: number;
  hooper_score_skill: number;
  total_games: number;
  wins: number;
  losses: number;
  home_court_id: string | null;
  is_pro: boolean;
  expo_push_token: string | null;
  womens_first_mode: boolean;
  games_until_rated: number;
  noshow_warning: boolean;
  created_at: string;
  // Joined
  home_court?: Court;
}

export interface Court {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  surface_type: string;
  has_lighting: boolean;
  is_indoor: boolean;
  created_at: string;
  // Virtual/computed
  active_game_count?: number;
  checkin_count?: number;
  activity_status?: 'active' | 'checkins' | 'inactive';
}

export interface CourtCondition {
  id: string;
  court_id: string;
  reported_by: string;
  net_status: NetStatus;
  surface_condition: SurfaceCondition;
  crowd_level: CrowdLevel;
  photo_url: string | null;
  created_at: string;
  // Joined
  reporter?: User;
}

export interface CourtFavorite {
  id: string;
  user_id: string;
  court_id: string;
  alert_threshold: number;
  created_at: string;
}

export interface CourtCheckin {
  id: string;
  court_id: string;
  user_id: string;
  created_at: string;
}

export interface Game {
  id: string;
  court_id: string;
  host_id: string;
  format: Format;
  elo_band: EloBand;
  max_players: number;
  scheduled_at: string;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  status: GameStatus;
  description: string | null;
  is_womens_only: boolean;
  share_token: string;
  created_at: string;
  // Joined
  court?: Court;
  host?: User;
  player_count?: number;
  players?: GamePlayer[];
  my_rsvp?: RsvpStatus;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string;
  rsvp_status: RsvpStatus;
  joined_at: string;
  // Joined
  user?: User;
}

export interface GameRating {
  id: string;
  game_id: string;
  rater_id: string;
  rated_user_id: string;
  skill_rating: number; // 1-5
  sportsmanship_rating: number; // 1-5
  punctuality_status: PunctualityStatus;
  created_at: string;
}

export interface GameMessage {
  id: string;
  game_id: string;
  user_id: string;
  message: string;
  created_at: string;
  // Joined
  user?: User;
}

export interface PlayerStats {
  id: string;
  user_id: string;
  game_id: string;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  result: GameResult;
  logged_at: string;
  // Joined
  game?: Game;
}

export interface Crew {
  id: string;
  name: string;
  color_hex: string;
  home_court_id: string | null;
  created_by: string;
  rep_score: number;
  wins: number;
  losses: number;
  created_at: string;
  // Joined
  home_court?: Court;
  members?: CrewMember[];
  member_count?: number;
}

export interface CrewMember {
  id: string;
  crew_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
  // Joined
  user?: User;
}

export interface CrewChallenge {
  id: string;
  challenger_crew_id: string;
  challenged_crew_id: string;
  proposed_game_id: string | null;
  status: ChallengeStatus;
  created_at: string;
  // Joined
  challenger_crew?: Crew;
  challenged_crew?: Crew;
}

export interface CrewMessage {
  id: string;
  crew_id: string;
  user_id: string;
  message: string;
  created_at: string;
  // Joined
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload_json: Record<string, any>;
  read: boolean;
  created_at: string;
}

// ─── UI Types ───────────────────────────────────────────────────────────────

export interface GameFilters {
  format: Format | 'All';
  eloBand: EloBand | 'Any';
  location: 'indoor' | 'outdoor' | 'any';
  time: 'today' | 'week' | 'any';
  womensOnly: boolean;
}

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  isGoodForBball: boolean;
}

export interface EloTierInfo {
  label: EloTier;
  min: number;
  max: number;
  color: string;
}
