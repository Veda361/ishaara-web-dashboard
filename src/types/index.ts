export type UserRole = "USER" | "DRIVER_CONDUCTOR" | "AGENCY_OWNER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isOnboarded?: boolean;
  phoneNumber?: string;
  image?: string | null;
  createdAt?: string;
}

export interface AuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
  user: User;
}

export type AgencyStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

export interface Agency {
  id: string;
  name: string;
  businessName?: string | null;
  city?: string | null;
  state?: string | null;
  contactPhoneMasked?: string | null;
  contactEmail: string;
  status: AgencyStatus;
  ownerUserId?: string;
  createdAt: string;
}

export interface AgencyStats {
  totalDrivers: number;
  activeDrivers: number;
  pendingMemberships: number;
  totalVehicles: number;
  activeVehicles: number;
  activeTrips: number;
}

export interface AgencyManageData {
  agency: Agency;
  stats?: AgencyStats;
}

export type MembershipStatus = "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED";
export type DriverOperatingType = "INDEPENDENT" | "AGENCY";
export type DriverStatus = "ONLINE" | "OFFLINE";
export type DriverVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface DriverInfo {
  id?: string;
  driverId?: string;
  userId?: string;
  name: string;
  email: string;
  yearsOfExperience?: number;
  operatingType?: DriverOperatingType;
  status?: DriverStatus;
  driverStatus?: DriverStatus;
  verificationStatus?: DriverVerificationStatus;
  driverVerificationStatus?: DriverVerificationStatus;
  licenseNumber?: string;
  licenseNumberMasked?: string;
  phoneNumber?: string;
}

export interface AgencyMembership {
  id: string;
  agencyId: string;
  driverId: string;
  status: MembershipStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  requestedAt?: string | null;
  respondedAt?: string | null;
  reviewedBy?: string | null;
  driver?: DriverInfo;
}

export type BackendVehicleType =
  | "AUTO"
  | "E_RICKSHAW"
  | "CAB"
  | "BUS"
  | "CAR"
  | "BIKE"
  | "OTHER";

export type VehicleType = BackendVehicleType | "MINIBUS" | "VAN";
export type VehicleOwnershipType = "AGENCY" | "DRIVER" | "INDIVIDUAL" | "OPERATOR";
export type VehicleVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface VehicleAssignmentInfo {
  assignmentId: string;
  driverId: string;
  driverName?: string;
  assignedAt: string;
}

export interface Vehicle {
  id: string;
  agencyId?: string | null;
  registrationNumber: string;
  make?: string;
  model: string;
  type?: VehicleType;
  vehicleType?: VehicleType;
  capacity?: number | null;
  ownershipType?: VehicleOwnershipType;
  isActive: boolean;
  verificationStatus?: VehicleVerificationStatus;
  currentAssignment?: VehicleAssignmentInfo | null;
  createdAt: string;
}

export type AssignmentStatus = "ACTIVE" | "COMPLETED" | "TERMINATED";

export interface DriverVehicleAssignment {
  id: string;
  agencyId: string;
  vehicleId: string;
  driverId: string;
  status: AssignmentStatus;
  assignedAt: string;
  unassignedAt?: string | null;
  vehicle?: Vehicle;
  driver?: DriverInfo;
}

export type TripStatus =
  | "CREATED"
  | "SCHEDULED"
  | "ASSIGNED"
  | "READY"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  displayName?: string;
  provider?: "google_maps" | "serpapi" | string;
  googlePlaceId?: string;
  serpApiDataId?: string;
  serpApiDataCid?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface TripLocationInput {
  name?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
  serpApiDataId?: string;
}

export interface LocationCoordinatesObject {
  type?: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface TripLocation {
  name?: string;
  formattedAddress?: string;
  coordinates?: LocationCoordinatesObject | [number, number];
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  serpApiDataId?: string;
}

export interface LocationPoint {
  name: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface Trip {
  id: string;
  agencyId?: string | null;
  vehicleId: string;
  driverId: string;
  origin: TripLocation;
  destination: TripLocation;
  scheduledDepartureAt?: string | null;
  scheduledStartTime?: string | null;
  status: TripStatus;
  vehicle?: Vehicle;
  driver?: DriverInfo;
  createdAt?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export * from "./settlement";
