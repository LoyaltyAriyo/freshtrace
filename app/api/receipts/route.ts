import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({
    message: "Receipt upload endpoint created",
  })
}