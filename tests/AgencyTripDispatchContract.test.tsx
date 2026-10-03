import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TripsPage from "@/app/dashboard/trips/page";
import { LocationPicker } from "@/components/trips/LocationPicker";
import { tripsApi, DispatchTripPayload } from "@/lib/api/trips";
import { locationsApi } from "@/lib/api/locations";
import { vehiclesApi } from "@/lib/api/vehicles";
import { membershipsApi } from "@/lib/api/memberships";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as AuthContextModule from "@/lib/auth/AuthContext";
import { ResolvedLocation, TripLocationInput } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/trips",
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

describe("Agency Fleet Dispatch & Location Contract Suite", () => {
  const mockAgency = {
    id: "6abfc5c876fbc787b93052d3",
    name: "Jhansi Express Fleet",
    contactEmail: "fleet@jhansi.com",
    status: "ACTIVE" as const,
    createdAt: "2026-10-01T00:00:00.000Z",
  };

  const mockJhansiResult: ResolvedLocation = {
    latitude: 25.4487699,
    longitude: 78.5697526,
    formattedAddress: "Uttar Pradesh, India",
    displayName: "Jhansi",
    provider: "serpapi",
    googlePlaceId: "ChIJA3e6WNR2dzkRyoE0XKXN6ZY",
    serpApiDataId: "0x397776d458ba7703:0x96e9cda55c3481ca",
  };

  const mockDatiaResult: ResolvedLocation = {
    latitude: 25.6653168,
    longitude: 78.4609182,
    formattedAddress: "Madhya Pradesh 475661, India",
    displayName: "Datia",
    provider: "serpapi",
    googlePlaceId: "ChIJpbfJpRgSdzkR8AVKAMhRsgI",
    serpApiDataId: "0x39771218a5c9b7a5:0x2b251c8004a05f0",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "6abfa37afac0b5a7cbd556e8",
        email: "devranjeetq@gmail.com",
        name: "devranjeetq",
        role: "AGENCY_OWNER",
      },
      ownedAgencies: [mockAgency],
      activeAgency: mockAgency,
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: true,
      isAdmin: false,
      error: null,
      loginWithToken: vi.fn(),
      logout: vi.fn(),
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
    });

    vi.spyOn(tripsApi, "listTrips").mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    vi.spyOn(vehiclesApi, "listVehicles").mockResolvedValue({
      items: [
        {
          id: "6abfcec3ecff5c8b5bed48bb",
          registrationNumber: "UP93AA4320",
          model: "Ashoka",
          isActive: true,
          createdAt: "2026-10-01T00:00:00.000Z",
        },
      ],
      pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });

    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue({
      items: [
        {
          id: "6ac09045c639422a5e7ef19f", // membership ID
          agencyId: "6abfc5c876fbc787b93052d3",
          driverId: "6ac0902cc639422a5e7ef184", // driver profile ID
          status: "APPROVED",
          createdAt: "2026-10-01T00:00:00.000Z",
          driver: {
            id: "6ac0902cc639422a5e7ef184",
            name: "Bhoomi Sahu",
            email: "bhoomi@sahu.com",
            verificationStatus: "VERIFIED",
            status: "ONLINE",
          },
        },
      ],
      pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });

    vi.spyOn(locationsApi, "search").mockImplementation(async (q) => {
      if (q.toLowerCase().includes("jhansi")) return [mockJhansiResult];
      if (q.toLowerCase().includes("datia")) return [mockDatiaResult];
      return [];
    });
  });

  describe("Contract Shape & Field Sanitization", () => {
    it("sanitizes payload and excludes unpermitted fields like provider or coordinates array", async () => {
      const dispatchSpy = vi.spyOn(tripsApi, "dispatchTrip").mockResolvedValue({
        id: "6ac234567890abcdef123456",
        driverId: "6ac0902cc639422a5e7ef184",
        vehicleId: "6abfcec3ecff5c8b5bed48bb",
        origin: {
          name: "Jhansi",
          formattedAddress: "Uttar Pradesh, India",
        },
        destination: {
          name: "Datia",
          formattedAddress: "Madhya Pradesh 475661, India",
        },
        scheduledDepartureAt: "2026-10-03T20:00:00.000Z",
        status: "SCHEDULED",
      });

      const rawInput: DispatchTripPayload = {
        driverId: "6ac0902cc639422a5e7ef184",
        vehicleId: "6abfcec3ecff5c8b5bed48bb",
        origin: {
          name: "Jhansi",
          formattedAddress: "Uttar Pradesh, India",
          latitude: 25.4487699,
          longitude: 78.5697526,
          googlePlaceId: "ChIJA3e6WNR2dzkRyoE0XKXN6ZY",
          serpApiDataId: "0x397776d458ba7703:0x96e9cda55c3481ca",
        },
        destination: {
          name: "Datia",
          formattedAddress: "Madhya Pradesh 475661, India",
          latitude: 25.6653168,
          longitude: 78.4609182,
          googlePlaceId: "ChIJpbfJpRgSdzkR8AVKAMhRsgI",
          serpApiDataId: "0x39771218a5c9b7a5:0x2b251c8004a05f0",
        },
        scheduledDepartureAt: "2026-10-03T20:00:00.000Z",
      };

      await tripsApi.dispatchTrip("6abfc5c876fbc787b93052d3", rawInput);

      expect(dispatchSpy).toHaveBeenCalledWith(
        "6abfc5c876fbc787b93052d3",
        expect.objectContaining({
          driverId: "6ac0902cc639422a5e7ef184",
          vehicleId: "6abfcec3ecff5c8b5bed48bb",
          origin: {
            name: "Jhansi",
            formattedAddress: "Uttar Pradesh, India",
            latitude: 25.4487699,
            longitude: 78.5697526,
            googlePlaceId: "ChIJA3e6WNR2dzkRyoE0XKXN6ZY",
            serpApiDataId: "0x397776d458ba7703:0x96e9cda55c3481ca",
          },
          destination: {
            name: "Datia",
            formattedAddress: "Madhya Pradesh 475661, India",
            latitude: 25.6653168,
            longitude: 78.4609182,
            googlePlaceId: "ChIJpbfJpRgSdzkR8AVKAMhRsgI",
            serpApiDataId: "0x39771218a5c9b7a5:0x2b251c8004a05f0",
          },
          scheduledDepartureAt: "2026-10-03T20:00:00.000Z",
        })
      );

      // Verify no banned properties are present
      const callPayload = dispatchSpy.mock.calls[0][1] as any;
      expect(callPayload.scheduledStartTime).toBeUndefined();
      expect(callPayload.origin.provider).toBeUndefined();
      expect(callPayload.origin.coordinates).toBeUndefined();
      expect(callPayload.destination.provider).toBeUndefined();
      expect(callPayload.destination.coordinates).toBeUndefined();
    });
  });

  describe("LocationPicker Interactive Flow", () => {
    it("searches and selects real location with coordinates badge", async () => {
      const handleChange = vi.fn();
      render(
        <LocationPicker
          label="Origin Location *"
          placeholder="Search origin..."
          value={null}
          onChange={handleChange}
          variant="origin"
        />
      );

      const input = screen.getByPlaceholderText("Search origin...");
      fireEvent.change(input, { target: { value: "Jhansi" } });

      await waitFor(() => {
        expect(locationsApi.search).toHaveBeenCalledWith("Jhansi", 6);
      });

      await waitFor(() => {
        expect(screen.getByText("Uttar Pradesh, India")).toBeInTheDocument();
      });

      const option = screen.getByText("Jhansi");
      fireEvent.click(option);

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jhansi",
          formattedAddress: "Uttar Pradesh, India",
          latitude: 25.4487699,
          longitude: 78.5697526,
        })
      );
    });

    it("renders selected location card with coordinates and allows clearing", () => {
      const handleChange = vi.fn();
      const selectedLoc: TripLocationInput = {
        name: "Jhansi",
        formattedAddress: "Uttar Pradesh, India",
        latitude: 25.4487699,
        longitude: 78.5697526,
      };

      render(
        <LocationPicker
          label="Origin Location *"
          value={selectedLoc}
          onChange={handleChange}
          variant="origin"
        />
      );

      expect(screen.getByText("Jhansi")).toBeInTheDocument();
      expect(screen.getByText("Uttar Pradesh, India")).toBeInTheDocument();
      expect(screen.getByText("25.44877, 78.56975")).toBeInTheDocument();

      const clearBtn = screen.getByTitle("Change location");
      fireEvent.click(clearBtn);

      expect(handleChange).toHaveBeenCalledWith(null);
    });
  });

  describe("TripsPage Dispatch Flow & Validation", () => {
    it("prevents dispatch when origin or destination is not selected and shows specific validation errors", async () => {
      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <TripsPage />
        </Wrapper>
      );

      // Open dispatch modal
      const dispatchBtn = screen.getByRole("button", { name: /dispatch trip/i });
      fireEvent.click(dispatchBtn);

      expect(screen.getByText("Agency Fleet Dispatch")).toBeInTheDocument();

      // Submit without selecting locations
      const submitBtn = document.getElementById("dispatch-submit-button")!;
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Please select a valid origin location from the search results.")
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("Please select a valid destination location from the search results.")
      ).toBeInTheDocument();
    });

    it("uses authoritative driver profile ID (not membership ID) and vehicle ID (not registration)", async () => {
      const dispatchSpy = vi.spyOn(tripsApi, "dispatchTrip").mockResolvedValue({
        id: "trip_123",
        driverId: "6ac0902cc639422a5e7ef184",
        vehicleId: "6abfcec3ecff5c8b5bed48bb",
        origin: { formattedAddress: "Uttar Pradesh, India" },
        destination: { formattedAddress: "Madhya Pradesh 475661, India" },
        status: "SCHEDULED",
      });

      const Wrapper = createTestWrapper();
      render(
        <Wrapper>
          <TripsPage />
        </Wrapper>
      );

      // Open dispatch modal
      fireEvent.click(screen.getByRole("button", { name: /dispatch trip/i }));

      // Select origin
      const originInput = screen.getByPlaceholderText(/search origin landmark/i);
      fireEvent.change(originInput, { target: { value: "Jhansi" } });

      await waitFor(() => {
        expect(screen.getByText("Jhansi")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Jhansi"));

      // Select destination
      const destInput = screen.getByPlaceholderText(/search destination landmark/i);
      fireEvent.change(destInput, { target: { value: "Datia" } });

      await waitFor(() => {
        expect(screen.getByText("Datia")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Datia"));

      // Select vehicle
      const vehicleSelect = screen.getByLabelText(/select vehicle/i);
      fireEvent.change(vehicleSelect, { target: { value: "6abfcec3ecff5c8b5bed48bb" } });

      // Select driver
      const driverSelect = screen.getByLabelText(/select driver/i);
      fireEvent.change(driverSelect, { target: { value: "6ac0902cc639422a5e7ef184" } });

      // Set scheduled start time
      const timeInput = screen.getByLabelText(/scheduled start time/i);
      fireEvent.change(timeInput, { target: { value: "2026-10-03T21:45" } });

      // Submit
      const submitBtn = document.getElementById("dispatch-submit-button")!;
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      });

      const callPayload = dispatchSpy.mock.calls[0][1];
      // Verify correct IDs
      expect(callPayload.vehicleId).toBe("6abfcec3ecff5c8b5bed48bb");
      expect(callPayload.driverId).toBe("6ac0902cc639422a5e7ef184");
      // Verify NOT membership ID
      expect(callPayload.driverId).not.toBe("6ac09045c639422a5e7ef19f");
      // Verify NOT vehicle registration number
      expect(callPayload.vehicleId).not.toBe("UP93AA4320");
      // Verify locations
      expect(callPayload.origin.latitude).toBe(25.4487699);
      expect(callPayload.origin.longitude).toBe(78.5697526);
      expect(callPayload.destination.latitude).toBe(25.6653168);
      expect(callPayload.destination.longitude).toBe(78.4609182);
      // Verify scheduledDepartureAt is ISO format
      expect(callPayload.scheduledDepartureAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
