import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT NOW()`)
    return NextResponse.json({
      success: true,
      time: result
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({
      success: false,
      error: String(error)
    })
  }
}