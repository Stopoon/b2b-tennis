# 프론트엔드 구현 완료 파일 목록

> 생성일: 2026-05-26
> 기술 스택: Next.js 14 App Router + TypeScript + Tailwind CSS

## 생성된 파일 목록

### 기본 설정 / 레이아웃
| 파일 | 설명 |
|------|------|
| `src/app/globals.css` | Tailwind 기본 import + 커스텀 CSS (스크롤바, 안전 영역 패딩, 포커스 스타일) |
| `src/app/layout.tsx` | 루트 레이아웃. BottomNav 포함, lang="ko", 메타데이터 설정 |
| `src/app/error.tsx` | 전역 에러 바운더리 (다시 시도 버튼 포함) |

### 컴포넌트
| 파일 | 설명 |
|------|------|
| `src/components/layout/BottomNav.tsx` | 하단 탭 네비게이션 (홈/경기/순위/선수). SVG 아이콘, usePathname()으로 active 감지 |

### 페이지
| 파일 | 설명 |
|------|------|
| `src/app/page.tsx` | 메인 대시보드 (서버 컴포넌트). 최근 경기 3개, 이번 달 순위 Top 5, 빠른 경기 기록 버튼 |
| `src/app/auth/login/page.tsx` | 로그인 페이지. Supabase 이메일+비밀번호 인증 |
| `src/app/players/page.tsx` | 선수 관리 (클라이언트 컴포넌트). CRUD 인라인 편집 |
| `src/app/games/page.tsx` | 경기 목록 (클라이언트 컴포넌트). 날짜 역순, "더 보기" 페이지네이션, 삭제 |
| `src/app/games/new/page.tsx` | 경기 기록 입력 폼. 4인 선수 선택(중복 방지), 세트 스코어 동적 추가/삭제 |
| `src/app/rankings/page.tsx` | 순위표. 날짜 프리셋(이번 달/지난 달/올해/작년/직접 입력), 모바일 카드 + 데스크탑 테이블 |

### 로딩 스켈레톤
| 파일 | 설명 |
|------|------|
| `src/app/games/loading.tsx` | 경기 목록 로딩 스켈레톤 |
| `src/app/rankings/loading.tsx` | 순위 페이지 로딩 스켈레톤 |
| `src/app/players/loading.tsx` | 선수 관리 로딩 스켈레톤 |

### 라이브러리 / 유틸
| 파일 | 설명 |
|------|------|
| `src/lib/supabase/client.ts` | 브라우저용 Supabase 클라이언트 (createBrowserClient) |
| `src/lib/supabase/server.ts` | 서버용 Supabase 클라이언트 (createServerClient, cookies 기반) |

### 타입
| 파일 | 설명 |
|------|------|
| `src/types/database.ts` | Database 타입, 도메인 인터페이스 (Player, GameWithDetails, RankingEntry 등), API 요청/응답 타입 |

## API 연동 요약

| 페이지 | 사용 API |
|--------|----------|
| 메인 대시보드 | `GET /api/games?limit=3`, `GET /api/rankings?from=...&to=...` |
| 선수 관리 | `GET /api/players`, `POST /api/players`, `PUT /api/players/[id]`, `DELETE /api/players/[id]` |
| 경기 목록 | `GET /api/games?page=...&limit=10`, `DELETE /api/games/[id]` |
| 경기 기록 | `GET /api/players`, `POST /api/games` |
| 순위 | `GET /api/rankings?from=...&to=...` |

## 디자인 시스템

- **Primary**: green-600 / green-700 (테니스 코트)
- **Accent**: yellow-400 (테니스 공) - 1위 뱃지 등에 활용
- **Background**: white + slate-50
- **카드**: bg-white rounded-xl border border-gray-100
- **모바일 우선**: 하단 탭 네비게이션, 카드 레이아웃
- **빈 상태**: 모든 목록에 빈 상태 메시지 + 행동 유도 버튼
