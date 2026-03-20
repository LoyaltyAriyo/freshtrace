export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const entry = formData.get("receipt")

    if (!entry || typeof entry === "string") {
      return Response.json(
        { error: "No receipt file uploaded." },
        { status: 400 }
      )
    }

    const receiptId =
      (typeof crypto !== "undefined" &&
        "randomUUID" in crypto &&
        crypto.randomUUID()) ||
      `receipt_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`

    return Response.json({ receiptId })
  } catch {
    return Response.json(
      { error: "Failed to process receipt upload." },
      { status: 500 }
    )
  }
}
