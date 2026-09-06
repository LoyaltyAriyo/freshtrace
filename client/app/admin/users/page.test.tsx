/* @vitest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import AdminUsersPage from "./page"

function mockFetchSuccess(users: unknown[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ users }),
  })
}

describe("AdminUsersPage filters and search", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("loads users on mount", async () => {
    const fetchMock = mockFetchSuccess([
      {
        id: "1",
        email: "a@x.com",
        fullName: "Ada",
        accountStatus: "ACTIVE",
        activityStatus: "Active",
      },
    ])
    vi.stubGlobal("fetch", fetchMock)

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/admin/users")
    })

    expect(await screen.findByTestId("admin-users-table")).toBeInTheDocument()
    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("a@x.com")).toBeInTheDocument()
  })

  it("debounces search and requests the q query parameter", async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetchSuccess([])
    vi.stubGlobal("fetch", fetchMock)

    render(<AdminUsersPage />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/admin/users")).toBe(true)
    fetchMock.mockClear()

    fireEvent.change(screen.getByLabelText(/search users by name or email/i), {
      target: { value: "ada" },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/admin/users?q=ada")).toBe(true)
  })

  it("shows clear filters and resets the list request", async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetchSuccess([])
    vi.stubGlobal("fetch", fetchMock)

    render(<AdminUsersPage />)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    const search = screen.getByRole("searchbox", {
      name: /search users by name or email/i,
    })

    fireEvent.change(search, {
      target: { value: "test" },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    const clear = screen.getByRole("button", { name: /clear filters/i })
    fetchMock.mockClear()

    fireEvent.click(clear)

    expect(search).toHaveValue("")

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/admin/users")).toBe(true)
    expect(fetchMock.mock.calls.every((c) => !String(c[0]).includes("?"))).toBe(true)
  })
})
