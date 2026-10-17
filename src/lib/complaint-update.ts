import type { Complaint, Prisma } from '@prisma/client';
import type { TokenPayload } from './auth';
import { canConfirmComplaint, canWorkComplaint } from './complaint-access';

export function prepareComplaintUpdate(user: TokenPayload, existing: Complaint, body: Record<string, unknown>) {
  const denied = (error: string, status = 400) => ({ error, status });
  const allowed = ['status', 'proofPhotoUrl', 'residentConfirmed', 'residentRating', 'residentFeedback',
    'assignedProviderId', 'assignedOrgType', 'moderationStatus', 'moderationNotes'];
  if (Object.keys(body).some(key => !allowed.includes(key))) return denied('Unknown update field');
  const groups = [body.status !== undefined, body.residentConfirmed !== undefined,
    body.assignedProviderId !== undefined || body.assignedOrgType !== undefined,
    body.moderationStatus !== undefined].filter(Boolean).length;
  if (groups !== 1) return denied('Send exactly one complaint action');
  const actionFields = body.status !== undefined ? ['status', 'proofPhotoUrl']
    : body.residentConfirmed !== undefined ? ['residentConfirmed', 'residentRating', 'residentFeedback']
    : body.moderationStatus !== undefined ? ['moderationStatus', 'moderationNotes']
    : ['assignedProviderId', 'assignedOrgType'];
  if (Object.keys(body).some(key => !actionFields.includes(key))) return denied('Do not mix fields from different actions');
  if (user.villageId !== existing.villageId) return denied('Not authorized', 403);

  const data: Prisma.ComplaintUncheckedUpdateManyInput = {};
  let action = '';
  if (body.residentConfirmed !== undefined) {
    if (!canConfirmComplaint(user, existing)) return denied('Only the recorded filer can verify a resolved complaint', 403);
    if (typeof body.residentConfirmed !== 'boolean') return denied('Confirmation must be true or false');
    if (body.residentRating !== undefined && (!Number.isInteger(body.residentRating) || Number(body.residentRating) < 1 || Number(body.residentRating) > 5)) {
      return denied('Rating must be an integer from 1 to 5');
    }
    if (body.residentFeedback !== undefined && (typeof body.residentFeedback !== 'string' || body.residentFeedback.length > 2000)) {
      return denied('Feedback must be text under 2000 characters');
    }
    data.residentConfirmed = body.residentConfirmed;
    data.residentRating = body.residentConfirmed ? Number(body.residentRating ?? 5) : 1;
    data.residentFeedback = typeof body.residentFeedback === 'string' ? body.residentFeedback.trim() : null;
    data.status = body.residentConfirmed ? 'CLOSED' : 'REOPENED';
    if (!body.residentConfirmed) data.escalationLevel = { increment: 1 };
    action = body.residentConfirmed ? 'RESIDENT_CONFIRMED_CLOSED' : 'RESIDENT_REJECTED_REOPENED';
  } else if (body.moderationStatus !== undefined) {
    if (user.role !== 'SARPANCH') return denied('Only the Sarpanch can moderate', 403);
    if (!['FLAGGED', 'PENDING'].includes(existing.moderationStatus)) return denied('Report is not awaiting moderation', 409);
    if (!['APPROVED', 'REJECTED'].includes(String(body.moderationStatus))) return denied('Invalid moderation action');
    data.moderationStatus = String(body.moderationStatus);
    data.status = body.moderationStatus === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
    data.isSpam = body.moderationStatus === 'REJECTED';
    action = `MODERATED_${body.moderationStatus}`;
  } else {
    if (!canWorkComplaint(user, existing)) return denied('Not assigned to your department or account', 403);
    if (body.status !== undefined) {
      const transitions: Record<string, string[]> = {
        VERIFIED: ['IN_PROGRESS'], ASSIGNED: ['ACCEPTED', 'IN_PROGRESS'],
        ACCEPTED: ['IN_PROGRESS'], REOPENED: ['IN_PROGRESS'], ESCALATED: ['IN_PROGRESS'],
        IN_PROGRESS: ['RESOLVED'],
      };
      if (typeof body.status !== 'string' || !transitions[existing.status]?.includes(body.status)) {
        return denied('Invalid status transition; refresh the complaint', 409);
      }
      if (existing.moderationStatus !== 'APPROVED' || existing.isSpam) return denied('Moderation approval required', 409);
      if (body.status === 'RESOLVED') {
        if (typeof body.proofPhotoUrl !== 'string' || !body.proofPhotoUrl.trim()) return denied('Resolution proof is required');
        const proof = body.proofPhotoUrl.trim();
        if (!/^https?:\/\//i.test(proof) && !/^\/(?!\/)/.test(proof)) return denied('Use an HTTP(S) image URL or local image path');
        try {
          const url = new URL(proof, 'http://local.invalid');
          if (!['https:', 'http:'].includes(url.protocol) || proof.length > 2000) return denied('Invalid proof URL');
        } catch { return denied('Invalid proof URL'); }
        data.proofPhotoUrl = proof;
        data.residentConfirmed = null;
        data.residentRating = null;
        data.residentFeedback = null;
      } else if (body.proofPhotoUrl !== undefined) return denied('Proof may only accompany resolution');
      data.status = body.status;
      action = `STATUS_CHANGE_TO_${body.status}`;
    } else {
      if (user.role === 'PROVIDER') return denied('Providers cannot reassign complaints', 403);
      if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(existing.status)) return denied('Complaint cannot be reassigned in this state', 409);
      if (body.assignedOrgType !== undefined) {
        if (user.role !== 'SARPANCH') return denied('Only the Sarpanch can reroute departments', 403);
        if (typeof body.assignedOrgType !== 'string' || !['JAL_SHAKTI', 'MSEDCL_ELECTRICITY', 'PWD_ROADS', 'PHC_HEALTH', 'KVK_AGRICULTURE', 'PANCHAYAT'].includes(body.assignedOrgType)) return denied('Invalid department');
        data.assignedOrgType = body.assignedOrgType;
      }
      if (body.assignedProviderId !== undefined) {
        if (typeof body.assignedProviderId !== 'string' || !body.assignedProviderId) return denied('Provider is required');
        data.assignedProviderId = body.assignedProviderId;
        data.status = 'ASSIGNED';
      }
      action = 'ASSIGNED';
    }
  }
  return { data, action };
}
