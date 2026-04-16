import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"
import { logError } from "@/lib/logger"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
	const { id } = await params

	if (!id) {
		return Response.json({ error: "Item ID is required." }, { status: 400 })
	}

	const userId = await getCurrentUserId(request)

	if (!userId) {
		return Response.json({ error: "You must be signed in to update items." }, { status: 401 })
	}

	const existing = await prisma.foodItem.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			quantity: true,
			categoryId: true,
			source: true,
			receiptId: true,
			status: true,
			userId: true,
		},
	})

	if (!existing || existing.userId !== userId) {
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
		const [updated] = await prisma.$transaction([
			prisma.foodItem.update({
				where: { id },
				data: {
					status: "WASTED",
				},
				select: {
					id: true,
					status: true,
				},
			}),
			prisma.wastedItem.upsert({
				where: {
					foodItemId: existing.id,
				},
				create: {
					foodItemId: existing.id,
					name: existing.name,
					quantity: existing.quantity,
					categoryId: existing.categoryId,
					source: existing.source,
					receiptId: existing.receiptId,
				},
				update: {
					name: existing.name,
					quantity: existing.quantity,
					categoryId: existing.categoryId,
					source: existing.source,
					receiptId: existing.receiptId,
					markedWastedAt: new Date(),
				},
				select: {
					id: true,
				},
			}),
			prisma.notification.create({
				data: {
					userId,
					foodItemId: existing.id,
					message: `You marked ${existing.name} as wasted.`,
					type: "WARNING",
				},
				select: {
					id: true,
				},
			}),
		])

		return Response.json({ id: updated.id, status: updated.status, changed: true })
	} catch (error) {
		await logError({
			message: "Failed to mark item as wasted.",
			error,
			errorType: "FOOD_ITEM_MARK_WASTED_FAILED",
			source: "DB",
			details: { route: "POST /api/items/[id]/wasted", itemId: id },
		})
		return Response.json(
			{ error: "Failed to mark item as wasted. Please try again." },
			{ status: 500 }
		)
	}
}
