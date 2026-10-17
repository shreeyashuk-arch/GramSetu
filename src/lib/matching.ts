export const RESOURCE_CATEGORIES = ['EQUIPMENT', 'VEHICLES', 'SKILLED_PEOPLE', 'HUMAN_RESOURCES', 'FACILITIES'] as const;

export function isResourceCategory(value: unknown): value is typeof RESOURCE_CATEGORIES[number] {
  return typeof value === 'string' && RESOURCE_CATEGORIES.some(category => category === value);
}

export function isResourceLocation(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export interface ResourceCandidate {
  id: string;
  name: string;
  category: string;
  capacity?: string | null;
  serviceArea?: string | null;
  availabilitySlots?: string | null;
  priceType: string;
  priceAmount?: number | null;
  contactPhone: string;
  lat: number;
  lng: number;
  owner: {
    id: string;
    name: string;
    trustScore: number;
    providerCategory?: string | null;
    isVerified: boolean;
  };
}

export interface RequestDetails {
  category: string;
  title: string;
  neededAt: Date | string;
  durationHours: number;
  urgency: string; // LOW, MEDIUM, HIGH, EMERGENCY
  lat: number;
  lng: number;
  zoneCode?: string;
}

export interface MatchScoreResult {
  resource: ResourceCandidate;
  totalScore: number; // 0 - 100
  breakdown: {
    proximityScore: number; // max 30
    availabilityScore: number; // max 25
    suitabilityScore: number; // max 20
    reliabilityScore: number; // max 15
    responseSpeedScore: number; // max 10
    distanceKm: number;
  };
  reasons: string[];
  summaryReason: string;
}

// Keep replay/rematching inputs in the existing JSON column; no schema change.
export interface RequestMatchMetadata {
  version: 1;
  location: { lat: number; lng: number } | null;
  declinedProviderIds: string[];
  breakdown: MatchScoreResult['breakdown'] | null;
}

export function readRequestMatchMetadata(raw: string | null): RequestMatchMetadata {
  const empty: RequestMatchMetadata = { version: 1, location: null, declinedProviderIds: [], breakdown: null };
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || value.version !== 1) return empty;
    return {
      ...empty,
      location: isResourceLocation(value.location?.lat, value.location?.lng) ? value.location : null,
      declinedProviderIds: Array.isArray(value.declinedProviderIds)
        ? [...new Set<string>(value.declinedProviderIds.filter((id: unknown) => typeof id === 'string'))]
        : [],
    };
  } catch {
    return empty;
  }
}

// Haversine formula to compute distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function scoreResourceMatch(
  resource: ResourceCandidate,
  request: RequestDetails
): MatchScoreResult {
  const reasons: string[] = [];
  const distanceKm = calculateDistanceKm(resource.lat, resource.lng, request.lat, request.lng);

  // 1. Proximity Score (max 30 pts)
  let proximityScore = 5;
  if (distanceKm <= 1.5) {
    proximityScore = 30;
    reasons.push(`Very close (${distanceKm} km away)`);
  } else if (distanceKm <= 3.5) {
    proximityScore = 25;
    reasons.push(`Nearby (${distanceKm} km)`);
  } else if (distanceKm <= 7.0) {
    proximityScore = 18;
    reasons.push(`Within village boundary (${distanceKm} km)`);
  } else if (distanceKm <= 15.0) {
    proximityScore = 10;
    reasons.push(`Moderate transit (${distanceKm} km)`);
  } else {
    reasons.push(`Farther distance (${distanceKm} km)`);
  }

  // 2. Availability Fit (max 25 pts)
  let availabilityScore = 20; // baseline available
  if (resource.availabilitySlots?.toLowerCase().includes('24x7') || resource.availabilitySlots?.toLowerCase().includes('emergency')) {
    availabilityScore = 25;
    reasons.push('Instant 24x7 / Emergency availability');
  } else if (resource.availabilitySlots) {
    availabilityScore = 22;
    reasons.push(`Active schedule: ${resource.availabilitySlots}`);
  }

  // 3. Suitability (max 20 pts)
  let suitabilityScore = 15;
  if (resource.category.toUpperCase() === request.category.toUpperCase()) {
    suitabilityScore += 5;
    reasons.push(`Exact match for ${resource.name} (${resource.capacity || 'Standard'})`);
  }

  // 4. Reliability / Trust (max 15 pts)
  const trust = Number.isFinite(resource.owner.trustScore)
    ? Math.min(Math.max(resource.owner.trustScore, 0), 1)
    : 0;
  const verifiedBonus = resource.owner.isVerified ? 3 : 0;
  const reliabilityScore = Math.min(Math.round(trust * 10) + verifiedBonus, 15);
  if (resource.owner.isVerified) {
    reasons.push('Panchayat Verified Provider');
  }

  // 5. Response Speed (max 10 pts)
  let responseSpeedScore = 8;
  if (request.urgency === 'EMERGENCY' || request.urgency === 'HIGH') {
    responseSpeedScore = resource.owner.isVerified ? 10 : 7;
  }

  const totalScore = Math.min(
    Math.round(proximityScore + availabilityScore + suitabilityScore + reliabilityScore + responseSpeedScore),
    100
  );

  const summaryReason = reasons.slice(0, 3).join(' • ');

  return {
    resource,
    totalScore,
    breakdown: {
      proximityScore,
      availabilityScore,
      suitabilityScore,
      reliabilityScore,
      responseSpeedScore,
      distanceKm,
    },
    reasons,
    summaryReason,
  };
}

export function rankMatchingResources(
  resources: ResourceCandidate[],
  request: RequestDetails,
  limit: number = 3
): MatchScoreResult[] {
  return resources
    .filter((r) => isResourceCategory(r.category.toUpperCase()) && r.category.toUpperCase() === request.category.toUpperCase())
    .map((r) => scoreResourceMatch(r, request))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
}
