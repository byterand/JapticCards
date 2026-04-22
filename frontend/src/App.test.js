import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App auth routing", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "application/json" },
      json: async () => ({ message: "No token provided" })
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("redirects protected dashboard to login when unauthenticated", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });
  });

  test("allows switching from login to register form", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });
    await userEvent.click(screen.getByText("Register"));
    expect(await screen.findByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });
});
