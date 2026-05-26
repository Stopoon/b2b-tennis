import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: '해당 선수를 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; nickname?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: '잘못된 JSON 형식입니다' },
      { status: 400 }
    )
  }

  // 최소 하나의 필드가 있어야 함
  if (body.name === undefined && body.nickname === undefined) {
    return NextResponse.json(
      { error: '수정할 필드가 없습니다' },
      { status: 400 }
    )
  }

  const updateData: Record<string, string | null> = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name || name.length > 50) {
      return NextResponse.json(
        { error: '선수 이름은 1~50자여야 합니다' },
        { status: 400 }
      )
    }
    updateData.name = name
  }

  if (body.nickname !== undefined) {
    const nickname = body.nickname?.trim() || null
    if (nickname && nickname.length > 30) {
      return NextResponse.json(
        { error: '닉네임은 30자 이내여야 합니다' },
        { status: 400 }
      )
    }
    updateData.nickname = nickname
  }

  const { data, error } = await supabase
    .from('players')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: '해당 선수를 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 선수가 존재하는지 확인
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('id')
    .eq('id', params.id)
    .single()

  if (fetchError || !player) {
    return NextResponse.json(
      { error: '해당 선수를 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  // 경기 기록에 참조되고 있는지 확인
  const { count: asPlayer1 } = await supabase
    .from('game_teams')
    .select('*', { count: 'exact', head: true })
    .eq('player1_id', params.id)

  const { count: asPlayer2 } = await supabase
    .from('game_teams')
    .select('*', { count: 'exact', head: true })
    .eq('player2_id', params.id)

  const hasGameRecords = ((asPlayer1 ?? 0) + (asPlayer2 ?? 0)) > 0

  if (hasGameRecords) {
    // soft delete: 경기 기록이 있으면 비활성화
    const { error: updateError } = await supabase
      .from('players')
      .update({ is_active: false })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { id: params.id, deleted: true, soft_delete: true },
    })
  } else {
    // hard delete: 경기 기록이 없으면 실제 삭제
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { id: params.id, deleted: true, soft_delete: false },
    })
  }
}
