---
name: ui-builder
description: "B2B Tennis 사이트의 Next.js 14 App Router + Tailwind CSS UI를 구현하는 스킬. 페이지, 컴포넌트, 순위표, 게임 입력 폼, 통계 화면 구현 시 반드시 이 스킬을 사용할 것. UI 개발, 화면 구현, 프론트엔드 작업 요청 시에도 사용."
---

# UI Builder — Next.js UI 구현 가이드

B2B Tennis 복식 리그 사이트의 Next.js 14 App Router + Tailwind CSS UI 구현 가이드.

## 프로젝트 구조

```
src/
  app/
    layout.tsx          # 루트 레이아웃 (네비게이션 포함)
    page.tsx            # 메인 대시보드
    league/page.tsx     # 리그 순위표
    games/
      page.tsx          # 경기 목록
      new/page.tsx      # 새 경기 기록
    players/page.tsx    # 선수 목록
    profile/page.tsx    # 내 프로필
    auth/
      login/page.tsx
      callback/route.ts
  components/
    ui/                 # 기본 UI 컴포넌트 (Button, Card, Badge...)
    league/             # 도메인 컴포넌트 (RankingTable, GameCard...)
  lib/
    supabase/
      client.ts         # 브라우저용 클라이언트
      server.ts         # 서버용 클라이언트
  types/
    database.ts         # Supabase 타입 (architect가 정의)
```

## Supabase 클라이언트 패턴

```typescript
// lib/supabase/server.ts — 서버 컴포넌트용
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
```

## 핵심 컴포넌트 구현 패턴

### 순위표 (RankingTable)
```tsx
// 서버 컴포넌트로 구현 (SEO + 초기 로드 성능)
// 컬럼: 순위, 선수명, 경기수, 승/무/패, 포인트, 세트득실, 게임득실
// 모바일: 순위/선수명/포인트만 표시, 나머지는 토글
```

### 게임 기록 입력 폼
```tsx
// Client Component ('use client')
// 단계별 입력: 1) 날짜/시즌 → 2) 팀 구성(파트너 선택) → 3) 세트 스코어 입력
// useForm + zod validation 권장
// 세트별 점수를 동적으로 추가/제거 가능하게 구현
```

### 모바일 우선 디자인
```tsx
// 네비게이션: 하단 탭 바 (모바일), 사이드바 (데스크탑)
// 카드 레이아웃으로 경기 결과 표시
// 터치 친화적 폼 요소 (큰 터치 영역)
```

## 색상/디자인 시스템

```
테니스 테마:
- Primary: 녹색 계열 (코트 색상) — green-600, green-700
- Accent: 노란색 (테니스 공) — yellow-400
- Text: slate-900 (기본), slate-500 (부가)
- Background: white + slate-50
- Win badge: green-100/green-700
- Loss badge: red-100/red-700
```

## 빈 상태(Empty State) 처리
모든 목록/테이블에 빈 상태를 구현하라:
- 순위표: "아직 등록된 경기가 없어요. 첫 경기를 기록해보세요!"
- 경기 목록: 경기 기록하기 버튼 포함
- 선수 목록: 관리자 초대 문구

## 로딩/에러 상태
```
app/league/
  page.tsx      # 데이터 패칭
  loading.tsx   # Skeleton UI
  error.tsx     # 에러 바운더리
```

## 환경 변수 체크리스트
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## references/ 참조
- 상세 컴포넌트 코드 예시: `references/component-examples.md`
