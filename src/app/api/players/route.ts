import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activeOnly = req.nextUrl.searchParams.get('active_only') !== 'false'

  let query = supabase.from('players').select('*').order('name')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; nickname?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: '잘못된 JSON 형식입니다' },
      { status: 400 }
    )
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json(
      { error: '선수 이름은 필수입니다' },
      { status: 400 }
    )
  }

  if (name.length > 50) {
    return NextResponse.json(
      { error: '선수 이름은 50자 이내여야 합니다' },
      { status: 400 }
    )
  }

  const nickname = body.nickname?.trim() || null
  if (nickname && nickname.length > 30) {
    return NextResponse.json(
      { error: '닉네임은 30자 이내여야 합니다' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ name, nickname })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
