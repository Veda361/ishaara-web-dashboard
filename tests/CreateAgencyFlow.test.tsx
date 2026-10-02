import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { CreateAgencyDialog } from "@/components/agency/CreateAgencyDialog";
import { agenciesApi } from "@/lib/api/agencies";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as AuthContextModule from "@/lib/auth/AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("Create Agency Profile Flow & AuthGuard Activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'No Registered Agency Found' and responsive 'Create Agency Profile' button when user has no owned agencies", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_admin_123",
        email: "devranjeetq@gmail.com",
        name: "Admin User",
        role: "ADMIN",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: false,
      isAdmin: true,
      ownedAgencies: [],
      activeAgency: null,
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
    });

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <AuthGuard>
          <div data-testid="dashboard-content">Dashboard Protected Content</div>
        </AuthGuard>
      </Wrapper>
    );

    expect(screen.getByText("No Registered Agency Found")).toBeInTheDocument();
    expect(
      screen.getByText(/Your account \(devranjeetq@gmail\.com\) is authenticated, but no mobility agency is registered/i)
    ).toBeInTheDocument();

    const createButton = screen.getByRole("button", { name: /Create Agency Profile/i });
    expect(createButton).toBeInTheDocument();

    // Protected content should NOT be rendered yet
    expect(screen.queryByTestId("dashboard-content")).not.toBeInTheDocument();
  });

  it("clicking 'Create Agency Profile' button visibly opens the CreateAgencyDialog modal", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_admin_123",
        email: "devranjeetq@gmail.com",
        name: "Admin User",
        role: "ADMIN",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: false,
      isAdmin: true,
      ownedAgencies: [],
      activeAgency: null,
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
    });

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </Wrapper>
    );

    const createButton = screen.getByRole("button", { name: /Create Agency Profile/i });
    fireEvent.click(createButton);

    // Modal dialog should now be visible with inputs
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create Agency Profile" })).toBeInTheDocument();
      expect(screen.getByLabelText(/Agency Name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contact Email \*/i)).toHaveValue("devranjeetq@gmail.com");
    });
  });

  it("submits valid agency registration payload to agenciesApi.registerAgency and triggers refresh", async () => {
    const mockRefreshAgencies = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_admin_123",
        email: "devranjeetq@gmail.com",
        name: "Admin User",
        role: "ADMIN",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: false,
      isAdmin: true,
      ownedAgencies: [],
      activeAgency: null,
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: mockRefreshAgencies,
    });

    const registerSpy = vi.spyOn(agenciesApi, "registerAgency").mockResolvedValueOnce({
      id: "agency_new_789",
      name: "Pune Metro Transit Agency",
      businessName: "PMTA Services LLP",
      city: "Pune",
      contactEmail: "devranjeetq@gmail.com",
      contactPhoneMasked: "******3210",
      status: "ACTIVE",
      createdAt: "2026-10-02T13:00:00.000Z",
    });

    const mockOnClose = vi.fn();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <CreateAgencyDialog isOpen={true} onClose={mockOnClose} />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText(/Agency Name \*/i), {
      target: { value: "Pune Metro Transit Agency" },
    });
    fireEvent.change(screen.getByLabelText(/Official Business \/ Legal Entity Name/i), {
      target: { value: "PMTA Services LLP" },
    });
    fireEvent.change(screen.getByLabelText(/Contact Phone \*/i), {
      target: { value: "+919876543210" },
    });
    fireEvent.change(screen.getByLabelText(/Operational City/i), {
      target: { value: "Pune" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Agency/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith({
        name: "Pune Metro Transit Agency",
        businessName: "PMTA Services LLP",
        contactEmail: "devranjeetq@gmail.com",
        contactPhone: "+919876543210",
        city: "Pune",
      });
      expect(mockRefreshAgencies).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith("Agency profile created successfully", "success");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error alert when registration API rejects", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_admin_123",
        email: "devranjeetq@gmail.com",
        name: "Admin User",
        role: "ADMIN",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: false,
      isAdmin: true,
      ownedAgencies: [],
      activeAgency: null,
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
    });

    vi.spyOn(agenciesApi, "registerAgency").mockRejectedValueOnce(
      new Error("AGENCY_NAME_ALREADY_EXISTS: An agency with this name is already registered.")
    );

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <CreateAgencyDialog isOpen={true} onClose={vi.fn()} />
      </Wrapper>
    );

    fireEvent.change(screen.getByLabelText(/Agency Name \*/i), {
      target: { value: "Duplicate Agency" },
    });
    fireEvent.change(screen.getByLabelText(/Contact Phone \*/i), {
      target: { value: "+919876543210" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Agency/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Registration Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/AGENCY_NAME_ALREADY_EXISTS/i)).toBeInTheDocument();
    });
  });

  it("renders protected dashboard content when user has owned agencies", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_admin_123",
        email: "devranjeetq@gmail.com",
        name: "Admin User",
        role: "ADMIN",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: true,
      isAdmin: true,
      ownedAgencies: [
        {
          id: "agency_active_123",
          name: "Pune Metro Transit Agency",
          contactEmail: "devranjeetq@gmail.com",
          status: "ACTIVE",
          createdAt: "2026-10-02T12:00:00.000Z",
        },
      ],
      activeAgency: {
        id: "agency_active_123",
        name: "Pune Metro Transit Agency",
        contactEmail: "devranjeetq@gmail.com",
        status: "ACTIVE",
        createdAt: "2026-10-02T12:00:00.000Z",
      },
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
    });

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <AuthGuard>
          <div data-testid="dashboard-content">Dashboard Protected Content</div>
        </AuthGuard>
      </Wrapper>
    );

    expect(screen.queryByText("No Registered Agency Found")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
  });
});
