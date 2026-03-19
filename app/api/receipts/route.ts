import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({
    receiptId: "temp-receipt-1",
  })
}