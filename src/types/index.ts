// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Shared TypeScript Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

// ── Re-export Prisma enums for use across the app ─────────────────────────
export type {
  UserRole,
  UserStatus,
  OrgStatus,
  OrgVerificationStatus,
  OrgMemberRole,
  ApiKeyStatus,
  CredentialStatus,
  VerificationStatus,
  KycProvider,
  DocumentType,
  DocumentStatus,
  TrustTier,
  TrustEventType,
  TrustEventCategory,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
} from "@prisma/client";

// ── API Response Wrapper ──────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Pagination Query ──────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ── Auth ─────────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;          // userId
  email: string;
  role: string;
  orgId?: string;
  trustTier: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: string;
  orgId?: string;
  trustTier: string;
  sessionId: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// ── User ─────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
}

// ── Trust Score ───────────────────────────────────────────────────────────
export interface TrustScoreData {
  id: string;
  score: number;
  tier: string;
  identityScore: number;
  behaviorScore: number;
  credentialScore: number;
  fraudPenalty: number;
  lastCalculatedAt: Date;
}

export interface TrustEventData {
  id: string;
  eventType: string;
  category: string;
  scoreDelta: number;
  reason: string;
  occurredAt: Date;
}

// ── Credential ────────────────────────────────────────────────────────────
export interface CredentialData {
  id: string;
  credentialType: string;
  schemaVersion: string;
  claims: Record<string, unknown>;
  status: string;
  issuedAt: Date;
  expiresAt?: Date | null;
  issuer: { id: string; firstName: string; lastName: string };
  organization: { id: string; name: string; slug: string };
}

export interface IssueCredentialInput {
  subjectUserId: string;
  credentialType: string;
  claims: Record<string, unknown>;
  expiresAt?: string;
}

// ── Verification Request ──────────────────────────────────────────────────
export interface VerificationRequestData {
  id: string;
  requestType: string;
  status: string;
  kycProvider: string;
  attemptNumber: number;
  submittedAt: Date;
  expiresAt?: Date | null;
}

// ── Notification ──────────────────────────────────────────────────────────
export interface NotificationData {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  readAt?: Date | null;
  createdAt: Date;
}

// ── Organization ──────────────────────────────────────────────────────────
export interface OrgData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  status: string;
  verificationStatus: string;
  memberCount: number;
  createdAt: Date;
}
