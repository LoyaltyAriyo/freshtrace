/* @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "u1" }),
}))

import AdminUserDetailsPage from "./page"

describe("AdminUserDetailsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders user details from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: {
            id: "u1",
            email: "a@example.com",
            fullName: "Ada",
            accountStatus: "ACTIVE",
            activityStatus: "Active",
          },
        }),
      }),
    )

    render(<AdminUserDetailsPage />)

    expect(await screen.findByTestId("admin-user-details-card")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("a@example.com")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/users/u1")
    })
  })
})

