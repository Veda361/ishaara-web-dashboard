import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VehiclesPage from "@/app/dashboard/vehicles/page";
import { vehiclesApi } from "@/lib/api/vehicles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as AuthContextModule from "@/lib/auth/AuthContext";
import { BackendVehicleType } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/vehicles",
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

describe("Vehicle Registration Strict Contract & Flow Suite", () => {
  const mockAgency = {
    id: "67041a99f1c4a9238910abcd",
    name: "Express Transit Agency",
    contactEmail: "transit@express.com",
    status: "ACTIVE" as const,
    createdAt: "2026-10-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_owner_123",
        email: "owner@express.com",
        name: "Fleet Owner",
        role: "AGENCY_OWNER",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: true,
      isAdmin: false,
      ownedAgencies: [mockAgency],
      activeAgency: mockAgency,
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
    });

    vi.spyOn(vehiclesApi, "listVehicles").mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it("submits exact authoritative request body with make, model, vehicleType, and parsed integer capacity", async () => {
    const registerSpy = vi.spyOn(vehiclesApi, "registerVehicle").mockResolvedValue({
      id: "veh_new_999",
      agencyId: mockAgency.id,
      registrationNumber: "UP93 AA 4320",
      make: "Ashok Leyland",
      model: "Ashoka",
      vehicleType: "BUS",
      capacity: 68,
      isActive: true,
      ownershipType: "AGENCY",
      createdAt: "2026-10-02T12:00:00.000Z",
    });

    const Wrapper = createTestWrapper();
    render(<VehiclesPage />, { wrapper: Wrapper });

    // Open Modal
    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    // Fill the inputs according to prompt specification
    const regInput = screen.getByLabelText(/registration number \*/i);
    const makeInput = screen.getByLabelText(/vehicle make \*/i);
    const modelInput = screen.getByLabelText(/vehicle model \*/i);
    const typeSelect = screen.getByLabelText(/vehicle type \*/i);
    const capacityInput = screen.getByLabelText(/seating capacity/i);

    fireEvent.change(regInput, { target: { value: "UP93 AA 4320" } });
    fireEvent.change(makeInput, { target: { value: "Ashok Leyland" } });
    fireEvent.change(modelInput, { target: { value: "Ashoka" } });
    fireEvent.change(typeSelect, { target: { value: "BUS" } });
    // User types "068" as in the reported problem
    fireEvent.change(capacityInput, { target: { value: "068" } });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });

    const [calledAgencyId, submittedPayload] = registerSpy.mock.calls[0];

    // Agency ID must be in URL param, NEVER in body
    expect(calledAgencyId).toBe("67041a99f1c4a9238910abcd");

    // Exact contract payload verification
    expect(submittedPayload).toEqual({
      registrationNumber: "UP93 AA 4320",
      vehicleType: "BUS",
      make: "Ashok Leyland",
      model: "Ashoka",
      capacity: 68,
    });

    // Verify forbidden fields are NOT sent
    const payloadObj = submittedPayload as unknown as Record<string, unknown>;
    expect(payloadObj.agencyId).toBeUndefined();
    expect(payloadObj.ownerUserId).toBeUndefined();
    expect(payloadObj.driverId).toBeUndefined();
    expect(payloadObj.operatorId).toBeUndefined();
    expect(payloadObj.ownershipType).toBeUndefined();
    expect(payloadObj.isVerified).toBeUndefined();
    expect(payloadObj.isActive).toBeUndefined();
    expect(payloadObj.id).toBeUndefined();
    expect(payloadObj._id).toBeUndefined();
    expect(payloadObj.createdAt).toBeUndefined();
    expect(payloadObj.updatedAt).toBeUndefined();
    expect(payloadObj.seatingCapacity).toBeUndefined();
    expect(payloadObj.seatCapacity).toBeUndefined();

    // Verify capacity was parsed to number 68, NOT string "068"
    expect(submittedPayload.capacity).toBe(68);
    expect(typeof submittedPayload.capacity).toBe("number");
  });

  it("omits optional capacity when field is left empty", async () => {
    const registerSpy = vi.spyOn(vehiclesApi, "registerVehicle").mockResolvedValue({
      id: "veh_new_100",
      agencyId: mockAgency.id,
      registrationNumber: "DL01 AB 1234",
      make: "Tata Motors",
      model: "Starbus",
      vehicleType: "BUS",
      isActive: true,
      ownershipType: "AGENCY",
      createdAt: "2026-10-02T12:00:00.000Z",
    });

    const Wrapper = createTestWrapper();
    render(<VehiclesPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    fireEvent.change(screen.getByLabelText(/registration number \*/i), {
      target: { value: "DL01 AB 1234" },
    });
    fireEvent.change(screen.getByLabelText(/vehicle make \*/i), {
      target: { value: "Tata Motors" },
    });
    fireEvent.change(screen.getByLabelText(/vehicle model \*/i), {
      target: { value: "Starbus" },
    });
    fireEvent.change(screen.getByLabelText(/vehicle type \*/i), {
      target: { value: "BUS" },
    });
    // Seating capacity left empty

    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });

    const [, submittedPayload] = registerSpy.mock.calls[0];
    expect(submittedPayload).toEqual({
      registrationNumber: "DL01 AB 1234",
      vehicleType: "BUS",
      make: "Tata Motors",
      model: "Starbus",
    });
    expect(submittedPayload.capacity).toBeUndefined();
  });

  it("validates required fields and shows clear error messages before submission", async () => {
    const registerSpy = vi.spyOn(vehiclesApi, "registerVehicle");

    const Wrapper = createTestWrapper();
    render(<VehiclesPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    // Click register vehicle without filling fields
    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    expect(registerSpy).not.toHaveBeenCalled();

    expect(screen.getByText("Registration number is required")).toBeInTheDocument();
    expect(screen.getByText("Vehicle make is required")).toBeInTheDocument();
    expect(screen.getByText("Vehicle model is required")).toBeInTheDocument();
  });

  it("validates capacity range (1 to 200) and displays exact error message", async () => {
    const registerSpy = vi.spyOn(vehiclesApi, "registerVehicle");

    const Wrapper = createTestWrapper();
    render(<VehiclesPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    fireEvent.change(screen.getByLabelText(/registration number \*/i), {
      target: { value: "MH12 CD 5678" },
    });
    fireEvent.change(screen.getByLabelText(/vehicle make \*/i), {
      target: { value: "Mahindra" },
    });
    fireEvent.change(screen.getByLabelText(/vehicle model \*/i), {
      target: { value: "Supro" },
    });

    // Test capacity > 200
    fireEvent.change(screen.getByLabelText(/seating capacity/i), {
      target: { value: "250" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    expect(registerSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Seating capacity must be between 1 and 200")).toBeInTheDocument();

    // Test capacity 0
    fireEvent.change(screen.getByLabelText(/seating capacity/i), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    expect(registerSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Seating capacity must be between 1 and 200")).toBeInTheDocument();

    // Test non-integer capacity
    fireEvent.change(screen.getByLabelText(/seating capacity/i), {
      target: { value: "45.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    expect(registerSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Seating capacity must be between 1 and 200")).toBeInTheDocument();
  });

  it("maps all vehicle type select labels to authoritative enum values", async () => {
    const typeMappings: { label: string; enumVal: BackendVehicleType }[] = [
      { label: "Auto", enumVal: "AUTO" },
      { label: "E-Rickshaw", enumVal: "E_RICKSHAW" },
      { label: "Cab", enumVal: "CAB" },
      { label: "Bus (Heavy Transit)", enumVal: "BUS" },
      { label: "Car", enumVal: "CAR" },
      { label: "Bike", enumVal: "BIKE" },
      { label: "Other", enumVal: "OTHER" },
    ];

    for (const mapping of typeMappings) {
      vi.clearAllMocks();
      const registerSpy = vi.spyOn(vehiclesApi, "registerVehicle").mockResolvedValue({
        id: `veh_${mapping.enumVal}`,
        agencyId: mockAgency.id,
        registrationNumber: `MH12 AB ${mapping.enumVal}`,
        make: "TestMake",
        model: "TestModel",
        vehicleType: mapping.enumVal,
        isActive: true,
        ownershipType: "AGENCY",
        createdAt: "2026-10-02T12:00:00.000Z",
      });

      const Wrapper = createTestWrapper();
      const { unmount } = render(<VehiclesPage />, { wrapper: Wrapper });

      fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

      fireEvent.change(screen.getByLabelText(/registration number \*/i), {
        target: { value: `MH12 AB ${mapping.enumVal}` },
      });
      fireEvent.change(screen.getByLabelText(/vehicle make \*/i), {
        target: { value: "TestMake" },
      });
      fireEvent.change(screen.getByLabelText(/vehicle model \*/i), {
        target: { value: "TestModel" },
      });
      fireEvent.change(screen.getByLabelText(/vehicle type \*/i), {
        target: { value: mapping.enumVal },
      });

      fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledTimes(1);
      });

      const [, submittedPayload] = registerSpy.mock.calls[0];
      expect(submittedPayload.vehicleType).toBe(mapping.enumVal);

      unmount();
    }
  });

  it("resets form, shows success notification, and closes modal upon registration success", async () => {
    vi.spyOn(vehiclesApi, "registerVehicle").mockResolvedValue({
      id: "veh_success_1",
      agencyId: mockAgency.id,
      registrationNumber: "UP93 AA 4320",
      make: "Ashok Leyland",
      model: "Ashoka",
      vehicleType: "BUS",
      capacity: 68,
      isActive: true,
      ownershipType: "AGENCY",
      createdAt: "2026-10-02T12:00:00.000Z",
    });

    const Wrapper = createTestWrapper();
    render(<VehiclesPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    const regInput = screen.getByLabelText(/registration number \*/i);
    const makeInput = screen.getByLabelText(/vehicle make \*/i);
    const modelInput = screen.getByLabelText(/vehicle model \*/i);

    fireEvent.change(regInput, { target: { value: "UP93 AA 4320" } });
    fireEvent.change(makeInput, { target: { value: "Ashok Leyland" } });
    fireEvent.change(modelInput, { target: { value: "Ashoka" } });

    fireEvent.click(screen.getByRole("button", { name: /register vehicle/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Vehicle registered to agency fleet",
        "success"
      );
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("fetches vehicles without status query parameter and filters by isActive client-side across ALL, ACTIVE, and INACTIVE tabs", async () => {
    const mockVehicles = [
      {
        id: "veh_1",
        agencyId: mockAgency.id,
        registrationNumber: "UP93 AA 1111",
        make: "Ashok Leyland",
        model: "Ashoka 1",
        vehicleType: "BUS" as BackendVehicleType,
        capacity: 68,
        isActive: true,
        ownershipType: "AGENCY" as const,
        createdAt: "2026-10-02T10:00:00.000Z",
      },
      {
        id: "veh_2",
        agencyId: mockAgency.id,
        registrationNumber: "UP93 AA 2222",
        make: "Tata",
        model: "Starbus",
        vehicleType: "BUS" as BackendVehicleType,
        capacity: 32,
        isActive: false,
        ownershipType: "AGENCY" as const,
        createdAt: "2026-10-02T11:00:00.000Z",
      },
    ];

    const listSpy = vi.spyOn(vehiclesApi, "listVehicles").mockResolvedValue({
      items: mockVehicles,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const Wrapper = createTestWrapper();
    render(<VehiclesPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(1);
    });

    // Verify listVehicles was called with page and limit only, NO status parameter
    const [calledAgencyId, calledParams] = listSpy.mock.calls[0];
    expect(calledAgencyId).toBe(mockAgency.id);
    expect(calledParams).toEqual({ page: 1, limit: 10 });
    expect((calledParams as Record<string, unknown>).status).toBeUndefined();

    // ALL tab (default): Both active and inactive vehicles should be visible
    await waitFor(() => {
      expect(screen.getAllByText("UP93 AA 1111").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("UP93 AA 2222").length).toBeGreaterThan(0);

    // Click ACTIVE tab
    fireEvent.click(screen.getByRole("button", { name: "ACTIVE" }));

    // No additional API call should be made!
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Only active vehicle should be visible
    expect(screen.getAllByText("UP93 AA 1111").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("UP93 AA 2222").length).toBe(0);

    // Click INACTIVE tab
    fireEvent.click(screen.getByRole("button", { name: "INACTIVE" }));

    // Still no additional API call!
    expect(listSpy).toHaveBeenCalledTimes(1);

    // Only inactive vehicle should be visible
    expect(screen.queryAllByText("UP93 AA 1111").length).toBe(0);
    expect(screen.getAllByText("UP93 AA 2222").length).toBeGreaterThan(0);

    // Click back to ALL tab
    fireEvent.click(screen.getByRole("button", { name: "ALL" }));
    expect(screen.getAllByText("UP93 AA 1111").length).toBeGreaterThan(0);
    expect(screen.getAllByText("UP93 AA 2222").length).toBeGreaterThan(0);
  });
});
