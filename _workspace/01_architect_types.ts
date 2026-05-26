// ============================================================
// B2B Tennis 복식 리그 - TypeScript 데이터 타입
// Supabase 자동생성 타입과 호환되는 구조
// ============================================================

// ------------------------------------------------------------
// Database 타입 (Supabase CLI `supabase gen types` 호환 형태)
// ------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          nickname: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          nickname?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          nickname?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          played_at: string;
          recorded_by: string;
          status: GameStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          played_at?: string;
          recorded_by: string;
          status?: GameStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          played_at?: string;
          recorded_by?: string;
          status?: GameStatus;
          updated_at?: string;
        };
      };
      game_teams: {
        Row: {
          id: string;
          game_id: string;
          side: TeamSide;
          player1_id: string;
          player2_id: string;
          sets_won: number;
          games_won: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          side: TeamSide;
          player1_id: string;
          player2_id: string;
          sets_won?: number;
          games_won?: number;
          created_at?: string;
        };
        Update: {
          sets_won?: number;
          games_won?: number;
        };
      };
      game_sets: {
        Row: {
          id: string;
          game_id: string;
          set_number: number;
          home_games: number;
          away_games: number;
          home_tiebreak: number | null;
          away_tiebreak: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          set_number: number;
          home_games: number;
          away_games: number;
          home_tiebreak?: number | null;
          away_tiebreak?: number | null;
          created_at?: string;
        };
        Update: {
          set_number?: number;
          home_games?: number;
          away_games?: number;
          home_tiebreak?: number | null;
          away_tiebreak?: number | null;
        };
      };
    };
  };
};

// ------------------------------------------------------------
// Enum / Literal 타입
// ------------------------------------------------------------
export type GameStatus = "completed" | "cancelled";
export type TeamSide = "home" | "away";

// ------------------------------------------------------------
// 도메인 인터페이스 (API 응답 등에서 사용)
// ------------------------------------------------------------

/** 선수 프로필 */
export interface Profile {
  id: string;
  name: string;
  nickname: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 경기 헤더 */
export interface Game {
  id: string;
  played_at: string;
  recorded_by: string;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}

/** 경기 팀 (복식 2인) */
export interface GameTeam {
  id: string;
  game_id: string;
  side: TeamSide;
  player1_id: string;
  player2_id: string;
  sets_won: number;
  games_won: number;
  created_at: string;
}

/** 세트별 점수 */
export interface GameSet {
  id: string;
  game_id: string;
  set_number: number;
  home_games: number;
  away_games: number;
  home_tiebreak: number | null;
  away_tiebreak: number | null;
  created_at: string;
}

// ------------------------------------------------------------
// 복합 타입 (API 응답용)
// ------------------------------------------------------------

/** 팀 + 선수 프로필 포함 */
export interface GameTeamWithPlayers extends GameTeam {
  player1: Profile;
  player2: Profile;
}

/** 경기 전체 상세 (팀, 세트 포함) */
export interface GameWithDetails extends Game {
  home_team: GameTeamWithPlayers;
  away_team: GameTeamWithPlayers;
  sets: GameSet[];
  recorded_by_profile: Profile;
}

/** 개인 통계 (순위 계산용) */
export interface PlayerStats {
  player_id: string;
  player_name: string;
  player_nickname: string | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  total_points: number;
  sets_for: number;
  sets_against: number;
  set_diff: number;
  games_for: number;
  games_against: number;
  game_diff: number;
}

/** 순위 엔트리 (순위 번호 포함) */
export interface RankingEntry extends PlayerStats {
  rank: number;
}

// ------------------------------------------------------------
// API 요청 타입
// ------------------------------------------------------------

/** 선수 등록/수정 요청 */
export interface PlayerCreateRequest {
  name: string;
  nickname?: string | null;
}

export interface PlayerUpdateRequest {
  name?: string;
  nickname?: string | null;
}

/** 세트 스코어 입력 */
export interface SetScoreInput {
  set_number: number;
  home_games: number;
  away_games: number;
  home_tiebreak?: number | null;
  away_tiebreak?: number | null;
}

/** 경기 기록 요청 */
export interface GameCreateRequest {
  played_at: string; // ISO 8601
  home_player1_id: string;
  home_player2_id: string;
  away_player1_id: string;
  away_player2_id: string;
  sets: SetScoreInput[];
}

/** 경기 목록 조회 파라미터 */
export interface GameListParams {
  from?: string; // ISO 날짜 (YYYY-MM-DD)
  to?: string; // ISO 날짜 (YYYY-MM-DD)
  page?: number;
  limit?: number;
}

/** 순위 조회 파라미터 */
export interface RankingParams {
  from: string; // ISO 날짜 (YYYY-MM-DD) - 필수
  to: string; // ISO 날짜 (YYYY-MM-DD) - 필수
}

// ------------------------------------------------------------
// API 응답 타입
// ------------------------------------------------------------

/** 페이지네이션 메타 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** 성공 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/** 에러 응답 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

// ------------------------------------------------------------
// 유틸 타입
// ------------------------------------------------------------

/** Supabase 테이블 Row 타입 추출 헬퍼 */
export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** Supabase 테이블 Insert 타입 추출 헬퍼 */
export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

/** Supabase 테이블 Update 타입 추출 헬퍼 */
export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

/** 포인트 상수 */
export const POINTS = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
} as const;
