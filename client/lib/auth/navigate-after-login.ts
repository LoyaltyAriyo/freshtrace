export function navigateAfterLogin(role: unknown) {
  // Login sets session cookies through a route handler. Load a fresh document
  // so a cached anonymous redirect cannot keep the user on the login page.
  window.location.replace(role === "ADMIN" ? "/admin" : "/")
}
