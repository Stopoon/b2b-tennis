-- ============================================================
-- B2B Tennis 복식 리그 - Supabase PostgreSQL 마이그레이션
-- 시즌 개념 없음. 날짜 범위(from/to)로 필터링.
-- ============================================================

-- 0. 확장 (Supabase 기본 제공이지만 명시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. profiles (Supabase auth.users 1:1 연동)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  nickname    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles IS '선수 프로필 (auth.users와 1:1)';
COMMENT ON COLUMN public.profiles.is_active IS 'false = soft delete (경기 기록 보존)';

-- ============================================================
-- 2. games (경기 헤더)
-- ============================================================
CREATE TABLE public.games (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  played_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL REFERENCES public.profiles(id),
  status      TEXT NOT NULL DEFAULT 'completed'
              CHECK (status IN ('completed', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.games IS '경기 기록 헤더';
COMMENT ON COLUMN public.games.recorded_by IS '이 경기를 기록한 사용자';
COMMENT ON COLUMN public.games.status IS 'completed | cancelled';

-- ============================================================
-- 3. game_teams (복식 팀 구성 + 세트/게임 집계)
-- ============================================================
CREATE TABLE public.game_teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  side        TEXT NOT NULL CHECK (side IN ('home', 'away')),
  player1_id  UUID NOT NULL REFERENCES public.profiles(id),
  player2_id  UUID NOT NULL REFERENCES public.profiles(id),
  sets_won    INT NOT NULL DEFAULT 0,
  games_won   INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 한 경기에 home/away 각 1팀씩만
  UNIQUE (game_id, side),
  -- player1과 player2가 동일인이면 안 됨
  CHECK (player1_id != player2_id)
);

COMMENT ON TABLE  public.game_teams IS '경기별 팀 (복식 2인 1팀)';
COMMENT ON COLUMN public.game_teams.sets_won IS '획득 세트 수 (game_sets에서 집계)';
COMMENT ON COLUMN public.game_teams.games_won IS '총 획득 게임 수 (game_sets에서 집계)';

-- ============================================================
-- 4. game_sets (세트별 점수)
-- ============================================================
CREATE TABLE public.game_sets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id         UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  set_number      INT NOT NULL CHECK (set_number BETWEEN 1 AND 3),
  home_games      INT NOT NULL CHECK (home_games >= 0),
  away_games      INT NOT NULL CHECK (away_games >= 0),
  home_tiebreak   INT CHECK (home_tiebreak >= 0),
  away_tiebreak   INT CHECK (away_tiebreak >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 한 경기에 같은 세트 번호 중복 불가
  UNIQUE (game_id, set_number)
);

COMMENT ON TABLE  public.game_sets IS '세트별 게임 점수';
COMMENT ON COLUMN public.game_sets.home_tiebreak IS '타이브레이크 점수 (7-6일 때만 사용, NULL 허용)';

-- ============================================================
-- 5. 인덱스
-- ============================================================

-- 경기 목록 조회: 날짜 역순 + 상태 필터
CREATE INDEX idx_games_played_at ON public.games(played_at DESC);
CREATE INDEX idx_games_status_played_at ON public.games(status, played_at DESC);

-- 순위 계산: 선수별 game_teams 조회
CREATE INDEX idx_game_teams_player1 ON public.game_teams(player1_id);
CREATE INDEX idx_game_teams_player2 ON public.game_teams(player2_id);
CREATE INDEX idx_game_teams_game_id ON public.game_teams(game_id);

-- 세트 조회: 경기별
CREATE INDEX idx_game_sets_game_id ON public.game_sets(game_id);

-- 프로필: 활성 선수 목록
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- ============================================================
-- 6. RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sets ENABLE ROW LEVEL SECURITY;

-- profiles: 인증된 사용자 읽기, 본인만 수정
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- games: 인증된 사용자 읽기/쓰기
CREATE POLICY "games_select_authenticated"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "games_insert_authenticated"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recorded_by);

CREATE POLICY "games_delete_authenticated"
  ON public.games FOR DELETE
  TO authenticated
  USING (auth.uid() = recorded_by);

-- game_teams: 인증된 사용자 읽기/쓰기
CREATE POLICY "game_teams_select_authenticated"
  ON public.game_teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "game_teams_insert_authenticated"
  ON public.game_teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "game_teams_delete_authenticated"
  ON public.game_teams FOR DELETE
  TO authenticated
  USING (true);

-- game_sets: 인증된 사용자 읽기/쓰기
CREATE POLICY "game_sets_select_authenticated"
  ON public.game_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "game_sets_insert_authenticated"
  ON public.game_sets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "game_sets_delete_authenticated"
  ON public.game_sets FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 7. updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_games_updated
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 8. Supabase Auth 트리거: 신규 가입 시 profiles 자동 생성
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'nickname'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
