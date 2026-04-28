import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App auth routing", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "application/json" },
      json: async () => ({ message: "No token provided" })
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders the landing page at the root url for unauthenticated visitors", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "A flashcard platform for classes and self-study" })
      ).toBeInTheDocument();
    });
  });

  test("redirects protected dashboard to login when unauthenticated", async () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    });
  });

  test("allows switching from login to register form", async () => {
    window.history.pushState({}, "", "/login");
    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back" });
    const registerLinks = await screen.findAllByRole("link", { name: "Register" });
    await userEvent.click(registerLinks[0]);
    expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });
});
