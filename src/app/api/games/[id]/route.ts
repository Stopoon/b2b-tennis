import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: { id: string }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 경기 조회
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('id, recorded_by')
    .eq('id', params.id)
    .single()

  if (fetchError || !game) {
    return NextResponse.json(
      { error: '해당 경기를 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  // 기록자 확인
  if (game.recorded_by !== user.id) {
    return NextResponse.json(
      { error: '본인이 기록한 경기만 삭제할 수 있습니다' },
      { status: 403 }
    )
  }

  // 삭제 (CASCADE로 game_teams, game_sets도 삭제)
  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .eq('id', params.id)

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: { id: params.id, deleted: true },
  })
}
