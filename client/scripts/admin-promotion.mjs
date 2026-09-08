import { isDeepStrictEqual } from "node:util"

const messages = Object.freeze({
  EMAIL_REQUIRED: "ADMIN_EMAIL is required.",
  CREATION_UNSUPPORTED: "Creation mode is not supported; use an existing verified account.",
  AUTH_LOOKUP_FAILED: "Auth lookup failed; no promotion was performed.",
  AUTH_PAGINATION_INVALID: "Auth pagination was incomplete or inconsistent.",
  AUTH_MISSING: "No matching Auth account exists; creation is disabled.",
  AUTH_DUPLICATE: "Multiple Auth email matches exist.",
  AUTH_UNCONFIRMED: "The Auth email must be confirmed before promotion.",
  AUTH_RESTRICTED: "The Auth account is explicitly restricted.",
  AUTH_RESTRICTION_INVALID: "Exposed Auth restriction state could not be verified.",
  PROFILE_MISSING: "An existing application profile is required.",
  PROFILE_DUPLICATE: "Multiple application email matches exist.",
  ID_MISMATCH: "Auth and application identities do not match.",
  PRECONDITION_CHANGED: "Account state changed during verification.",
  VERIFICATION_FAILED: "Verification failed; the database transaction was rolled back.",
})

class PromotionError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

function refuse(code) {
  throw new PromotionError(code)
}

export function safeFailureMessage(error) {
  // Never interpolate provider errors: they can contain SQL, identifiers or secrets.
  return `Admin promotion refused: ${
    error instanceof PromotionError
      ? messages[error.code]
      : "operation failed; inspect server connectivity and account prerequisites."
  }`
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

/**
 * Always exhaust pagination, including pages after a match, to detect duplicates.
 * Advance page numbers ourselves: some SDK versions truncate Link page numbers.
 * An empty page proves completion, even if the server clamps perPage.
 */
async function scanAuth(admin, email) {
  const seen = new Set()
  const matches = []
  let expectedTotal
  for (let page = 1; page <= 10000; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 1000 })
    if (error || !Array.isArray(data?.users)) refuse("AUTH_LOOKUP_FAILED")
    if (Number.isSafeInteger(data.total) && data.total > 0) {
      if (expectedTotal !== undefined && expectedTotal !== data.total) {
        refuse("AUTH_PAGINATION_INVALID")
      }
      expectedTotal = data.total
    }
    if (data.users.length === 0) {
      if (expectedTotal !== undefined && seen.size !== expectedTotal) {
        refuse("AUTH_PAGINATION_INVALID")
      }
      return { matches, count: seen.size }
    }
    for (const user of data.users) {
      if (!user.id || seen.has(user.id)) refuse("AUTH_PAGINATION_INVALID")
      seen.add(user.id)
      if (normalizeEmail(user.email) === email) matches.push(user)
    }
  }
  refuse("AUTH_PAGINATION_INVALID")
}

function requireConfirmedMatch(matches) {
  if (!matches.length) refuse("AUTH_MISSING")
  if (matches.length !== 1) refuse("AUTH_DUPLICATE")
  const user = matches[0]
  if (typeof user.email_confirmed_at !== "string" ||
      !user.email_confirmed_at || !Number.isFinite(Date.parse(user.email_confirmed_at))) {
    refuse("AUTH_UNCONFIRMED")
  }
  return user
}

function restrictionState(user, field, now) {
  const available = Object.hasOwn(user, field)
  if (!available) return { available: false, restricted: false }
  const value = user[field]
  if (value === null || value === "") return { available: true, restricted: false }
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    refuse("AUTH_RESTRICTION_INVALID")
  }
  return { available: true, restricted: field === "deleted_at" || Date.parse(value) > now }
}

async function readAuthPrerequisites(admin, email) {
  const scan = await scanAuth(admin, email)
  const listed = requireConfirmedMatch(scan.matches)
  const { data, error } = await admin.getUserById(listed.id)
  if (error || !data?.user) refuse("AUTH_LOOKUP_FAILED")
  const detailed = requireConfirmedMatch([data.user])
  if (detailed.id !== listed.id || normalizeEmail(detailed.email) !== email) {
    refuse("PRECONDITION_CHANGED")
  }

  // These are the restriction fields exposed by the installed Supabase User API.
  // Auth disabling is represented by a ban; there is no separate disabled field.
  // Keep endpoint availability separately: absence must not conceal a lost signal.
  const now = Date.now()
  const restrictions = {}
  for (const field of ["banned_until", "deleted_at"]) {
    restrictions[field] = {
      listed: restrictionState(listed, field, now),
      detailed: restrictionState(detailed, field, now),
    }
    if (Object.values(restrictions[field]).some((state) => state.restricted)) {
      refuse("AUTH_RESTRICTED")
    }
  }
  return {
    count: scan.count,
    snapshot: {
      id: detailed.id,
      email: normalizeEmail(detailed.email),
      emailConfirmed: true,
      matchCount: scan.matches.length,
      restrictions,
    },
  }
}

async function recheckAuth(admin, email, before, failureCode) {
  try {
    const current = await readAuthPrerequisites(admin, email)
    // Only this explicitly constructed snapshot is compared, never provider objects.
    if (current.count !== before.count || !isDeepStrictEqual(current.snapshot, before.snapshot)) {
      refuse(failureCode)
    }
  } catch {
    refuse(failureCode)
  }
}

const profileSelect = {
  id: true, email: true, fullName: true, role: true, accountStatus: true,
  createdAt: true, updatedAt: true,
  // Compare relationship membership without reading receipt or notification contents.
  receipts: { select: { id: true }, orderBy: { id: "asc" } },
  foodItems: { select: { id: true }, orderBy: { id: "asc" } },
  notifications: { select: { id: true }, orderBy: { id: "asc" } },
}

async function matchingProfiles(db, email) {
  return db.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    take: 2,
    select: profileSelect,
  })
}

function requireProfile(matches, authUser) {
  if (!matches.length) refuse("PROFILE_MISSING")
  if (matches.length !== 1) refuse("PROFILE_DUPLICATE")
  if (matches[0].id !== authUser.id) refuse("ID_MISMATCH")
  return matches[0]
}

function preservedProfile(profile) {
  const { role, accountStatus, updatedAt, ...preserved } = profile
  void role
  void accountStatus
  void updatedAt
  return preserved
}

export async function promoteExistingAdmin({ env, prisma, admin }) {
  const email = normalizeEmail(env.ADMIN_EMAIL)
  if (!email) refuse("EMAIL_REQUIRED")
  if (env.ADMIN_CREATE_IF_MISSING === "true") refuse("CREATION_UNSUPPORTED")

  const authBefore = await readAuthPrerequisites(admin, email)
  const authUser = authBefore.snapshot

  // No password or full-name lookup is needed for an existing profile.
  // Auth is read-only throughout this workflow.
  return prisma.$transaction(async (tx) => {
    const profile = requireProfile(await matchingProfiles(tx, email), authUser)
    const usersBefore = await tx.user.count()
    await recheckAuth(admin, email, authBefore, "PRECONDITION_CHANGED")

    const unchanged = profile.role === "ADMIN" && profile.accountStatus === "ACTIVE"
    if (!unchanged) {
      const updated = await tx.user.updateMany({
        where: {
          id: profile.id, email: profile.email, fullName: profile.fullName,
          role: profile.role, accountStatus: profile.accountStatus, updatedAt: profile.updatedAt,
        },
        data: { role: "ADMIN", accountStatus: "ACTIVE" },
      })
      if (updated.count !== 1) refuse("PRECONDITION_CHANGED")
    }

    const after = requireProfile(await matchingProfiles(tx, email), authUser)
    await recheckAuth(admin, email, authBefore, "VERIFICATION_FAILED")
    if (
      after.role !== "ADMIN" || after.accountStatus !== "ACTIVE" ||
      !isDeepStrictEqual(preservedProfile(profile), preservedProfile(after)) ||
      (unchanged && !isDeepStrictEqual(profile, after)) ||
      usersBefore !== await tx.user.count()
    ) {
      refuse("VERIFICATION_FAILED")
    }

    return {
      outcome: unchanged ? "ALREADY_ADMIN" : "PROMOTED",
      role: "ADMIN",
      accountStatus: "ACTIVE",
      authMatches: 1,
      profileMatches: 1,
      emailConfirmed: true,
      identitiesMatch: true,
      authPrerequisitesUnchanged: true,
      noExposedAuthRestrictions: true,
      authUsersModified: 0,
      profilePreserved: true,
      authUsersCreated: 0,
      applicationUsersCreated: 0,
      applicationUsersUpdated: unchanged ? 0 : 1,
      relatedRecordsPreserved: true,
      relatedRecordCounts: {
        receipts: after.receipts.length,
        foodItems: after.foodItems.length,
        notifications: after.notifications.length,
      },
    }
  }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 60000 })
}
