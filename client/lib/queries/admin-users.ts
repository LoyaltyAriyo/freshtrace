import { prisma } from "@/lib/prisma"

import type { Prisma } from "@/generated/prisma-client"

const adminUserRecordSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  accountStatus: true,
  createdAt: true,
} satisfies Prisma.UserSelect

export type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof adminUserRecordSelect
}>

export type AdminUserRecordsFilter = {
  where?: Prisma.UserWhereInput
  limit?: number
  offset?: number
}

export type AdminUserRecordsResult = {
  users: AdminUserRecord[]
  total: number
}

export async function getAdminUserRecords(
  filter: AdminUserRecordsFilter = {},
): Promise<AdminUserRecordsResult> {
  const { where = {}, limit = 20, offset = 0 } = filter

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: adminUserRecordSelect,
    }),
    prisma.user.count({ where }),
  ])

  return { users, total }
}
