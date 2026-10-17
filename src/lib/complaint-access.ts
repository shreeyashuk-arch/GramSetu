import type { UserRole } from './auth';

export interface ComplaintAccessUser {
  userId: string;
  villageId: string;
  role: UserRole;
  organizationType?: string | null;
}

export interface ComplaintAccessRecord {
  villageId: string;
  residentId?: string | null;
  assignedOrgType?: string | null;
  assignedProviderId?: string | null;
  isAnonymous?: boolean;
  moderationStatus?: string;
  isSpam?: boolean;
  status?: string;
}

type Viewer = ComplaintAccessUser | null | undefined;

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sameVillage(user: Viewer, complaint: ComplaintAccessRecord): user is ComplaintAccessUser {
  return !!user && nonempty(user.userId) && nonempty(user.villageId) &&
    nonempty(complaint.villageId) && user.villageId === complaint.villageId &&
    ['RESIDENT', 'SARPANCH', 'ORGANIZATION', 'PROVIDER'].includes(user.role);
}

function isOwner(user: ComplaintAccessUser, complaint: ComplaintAccessRecord): boolean {
  return complaint.isAnonymous !== true && nonempty(complaint.residentId) &&
    complaint.residentId === user.userId;
}

/** Actor authorization only; handlers must additionally validate work transitions. */
export function canWorkComplaint(user: Viewer, complaint: ComplaintAccessRecord): boolean {
  if (!sameVillage(user, complaint)) return false;
  if (user.role === 'SARPANCH') return true;
  if (user.role === 'ORGANIZATION') {
    return nonempty(user.organizationType) && nonempty(complaint.assignedOrgType) &&
      user.organizationType === complaint.assignedOrgType;
  }
  return user.role === 'PROVIDER' && nonempty(complaint.assignedProviderId) &&
    complaint.assignedProviderId === user.userId;
}

export function canReadPrivateComplaint(user: Viewer, complaint: ComplaintAccessRecord): boolean {
  return sameVillage(user, complaint) &&
    (isOwner(user, complaint) || canWorkComplaint(user, complaint));
}

/** Guest queries still need an explicit village filter at the collection boundary. */
export function canViewComplaint(user: Viewer, complaint: ComplaintAccessRecord): boolean {
  if (!nonempty(complaint.villageId) || (user && !sameVillage(user, complaint))) return false;
  return canReadPrivateComplaint(user, complaint) ||
    (complaint.isAnonymous === false && complaint.isSpam === false &&
      complaint.moderationStatus === 'APPROVED');
}

/** A staff role never substitutes for being the recorded filer. */
export function canConfirmComplaint(user: Viewer, complaint: ComplaintAccessRecord): boolean {
  return sameVillage(user, complaint) && isOwner(user, complaint) &&
    complaint.status === 'RESOLVED';
}

type Timestamp = Date | string;

/** Structurally compatible with Prisma records, with or without included relations. */
export interface ComplaintSerializationRecord extends ComplaintAccessRecord {
  id?: string;
  code?: string;
  category?: string;
  title?: string;
  description?: string;
  photoUrl?: string | null;
  proofPhotoUrl?: string | null;
  lat?: number;
  lng?: number;
  coarseLat?: number;
  coarseLng?: number;
  address?: string | null;
  priorityScore?: number;
  priorityBand?: string;
  priorityFactors?: string | null;
  slaHours?: number;
  slaExpiresAt?: Timestamp | null;
  escalationLevel?: number;
  supporterCount?: number;
  residentConfirmed?: boolean | null;
  residentRating?: number | null;
  residentFeedback?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  zone?: { id: string; name: string; code?: string } | null;
  resident?: { id: string; name: string; phone?: string; trustScore?: number } | null;
  assignedProvider?: { id: string; name: string; phone?: string; providerCategory?: string | null } | null;
  auditLogs?: { action: string; createdAt: Timestamp }[];
  _count?: { supporters: number };
}

function coordinate(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Standard response projection, never the anonymous tracking response.
 * Hidden rows return null. Tracking secrets, proxy fields, supporter identities,
 * raw audit details/actors, and unknown columns are deliberately never copied.
 */
export function serializeComplaint(user: Viewer, complaint: ComplaintSerializationRecord) {
  if (!canViewComplaint(user, complaint)) return null;

  const privateRead = canReadPrivateComplaint(user, complaint);
  const zone = complaint.zone
    ? { id: complaint.zone.id, name: complaint.zone.name, code: complaint.zone.code }
    : null;

  return {
    id: complaint.id,
    code: complaint.code,
    villageId: complaint.villageId,
    category: complaint.category,
    title: complaint.title,
    description: complaint.description,
    photoUrl: complaint.photoUrl,
    proofPhotoUrl: complaint.proofPhotoUrl,
    lat: coordinate(privateRead ? complaint.lat : complaint.coarseLat),
    lng: coordinate(privateRead ? complaint.lng : complaint.coarseLng),
    coarseLat: coordinate(complaint.coarseLat),
    coarseLng: coordinate(complaint.coarseLng),
    // Raw addresses may identify a home even when GPS is coarsened.
    address: privateRead ? complaint.address : zone?.name || null,
    zone,
    priorityScore: complaint.priorityScore,
    priorityBand: complaint.priorityBand,
    priorityFactors: complaint.priorityFactors,
    status: complaint.status,
    assignedOrgType: complaint.assignedOrgType,
    slaHours: complaint.slaHours,
    slaExpiresAt: complaint.slaExpiresAt,
    escalationLevel: complaint.escalationLevel,
    supporterCount: complaint.supporterCount ?? complaint._count?.supporters ?? 0,
    residentConfirmed: complaint.residentConfirmed,
    residentRating: complaint.residentRating,
    residentFeedback: complaint.residentFeedback,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    isAnonymous: complaint.isAnonymous,
    auditLogs: complaint.auditLogs?.map((log) => ({
      action: log.action,
      createdAt: log.createdAt,
    })),
    permissions: {
      canReadPrivate: privateRead,
      canWork: canWorkComplaint(user, complaint),
      canConfirm: canConfirmComplaint(user, complaint),
    },
    ...(privateRead ? {
      residentId: complaint.isAnonymous ? null : complaint.residentId,
      resident: !complaint.isAnonymous && complaint.resident ? {
        id: complaint.resident.id,
        name: complaint.resident.name,
        phone: complaint.resident.phone,
        trustScore: complaint.resident.trustScore,
      } : null,
      assignedProviderId: complaint.assignedProviderId,
      assignedProvider: complaint.assignedProvider ? {
        id: complaint.assignedProvider.id,
        name: complaint.assignedProvider.name,
        phone: complaint.assignedProvider.phone,
        providerCategory: complaint.assignedProvider.providerCategory,
      } : null,
      moderationStatus: complaint.moderationStatus,
      isSpam: complaint.isSpam,
    } : {}),
  };
}

export type SerializedComplaint = NonNullable<ReturnType<typeof serializeComplaint>>;
