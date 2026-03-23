import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
	const { id } = await params

	if (!id) {
		return Response.json({ error: "Item ID is required." }, { status: 400 })
	}

	const existing = await prisma.foodItem.findUnique({
		where: { id },
		select: {
			id: true,
			status: true,
		},
	})

	if (!existing) {
		return Response.json({ error: "Item not found." }, { status: 404 })
	}

	if (existing.status === "WASTED") {
		return Response.json({ id: existing.id, status: existing.status, changed: false })
	}

	if (existing.status !== "ACTIVE") {
		return Response.json(
			{ error: "Only active items can be marked as wasted." },
			{ status: 409 }
		)
	}

	try {
		const updated = await prisma.foodItem.update({
			where: { id },
			data: {
				status: "WASTED",
			},
			select: {
				id: true,
				status: true,
			},
		})

		return Response.json({ id: updated.id, status: updated.status, changed: true })
	} catch (error) {
		console.error("Failed to mark item as wasted:", error)
		return Response.json(
			{ error: "Failed to mark item as wasted. Please try again." },
			{ status: 500 }
		)
	}
}
