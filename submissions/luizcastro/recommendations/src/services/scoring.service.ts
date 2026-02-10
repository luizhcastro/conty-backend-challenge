import type { Creator } from "../types/creator.types";
import type { FitBreakdown, RecommendationRequest } from "../types/recommendation.types";
import type { PastDeal } from "../types/past-deal.types";
import type { Campaign } from "../types/campaign.types";

export const WEIGHTS = {
  tags: 0.30,
  audience_overlap: 0.25,
  performance: 0.20,
  budget_fit: 0.15,
  reliability: 0.10,
} as const;

export const SCORING_VERSION = "1.0";

// --- Individual scoring functions ---

export function tagsScore(campaignTags: string[], creatorTags: string[]): number {
  const setA = new Set(campaignTags);
  const setB = new Set(creatorTags);
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

export function audienceScore(
  campaignTarget: RecommendationRequest["audience_target"],
  creator: Creator
): number {
  const countryPart = countryScore(campaignTarget.country, creator.audience_location);
  const agePart = ageOverlapScore(campaignTarget.age_range, creator.audience_age);
  return 0.5 * countryPart + 0.5 * agePart;
}

export function countryScore(
  campaignCountries: string[],
  creatorLocations: string[]
): number {
  if (campaignCountries.length === 0) return 0;
  const set = new Set(creatorLocations);
  const matched = campaignCountries.filter((c) => set.has(c)).length;
  return matched / campaignCountries.length;
}

export function ageOverlapScore(
  campaignRanges: Array<{ min: number; max: number }>,
  creatorRanges: Array<{ min: number; max: number }>
): number {
  const campaignAges = new Set<number>();
  for (const r of campaignRanges) {
    for (let i = r.min; i <= r.max; i++) campaignAges.add(i);
  }
  const creatorAges = new Set<number>();
  for (const r of creatorRanges) {
    for (let i = r.min; i <= r.max; i++) creatorAges.add(i);
  }
  const intersection = [...campaignAges].filter((a) => creatorAges.has(a)).length;
  const union = new Set([...campaignAges, ...creatorAges]).size;
  if (union === 0) return 0;
  return intersection / union;
}

export interface GlobalStats {
  minViews: number;
  maxViews: number;
  minCtr: number;
  maxCtr: number;
  minCvr: number;
  maxCvr: number;
}

export function computeGlobalStats(creators: Creator[]): GlobalStats {
  if (creators.length === 0) {
    return { minViews: 0, maxViews: 0, minCtr: 0, maxCtr: 0, minCvr: 0, maxCvr: 0 };
  }
  return {
    minViews: Math.min(...creators.map((c) => c.avg_views)),
    maxViews: Math.max(...creators.map((c) => c.avg_views)),
    minCtr: Math.min(...creators.map((c) => c.ctr)),
    maxCtr: Math.max(...creators.map((c) => c.ctr)),
    minCvr: Math.min(...creators.map((c) => c.cvr)),
    maxCvr: Math.max(...creators.map((c) => c.cvr)),
  };
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

export function performanceScore(creator: Creator, stats: GlobalStats): number {
  const viewsNorm = normalize(creator.avg_views, stats.minViews, stats.maxViews);
  const ctrNorm = normalize(creator.ctr, stats.minCtr, stats.maxCtr);
  const cvrNorm = normalize(creator.cvr, stats.minCvr, stats.maxCvr);
  return (viewsNorm + ctrNorm + cvrNorm) / 3;
}

export function budgetScore(priceMin: number, priceMax: number, budgetCents: number): number {
  if (budgetCents <= 0) return 0;
  const creatorMid = (priceMin + priceMax) / 2;
  if (creatorMid <= 0) return 0;

  if (creatorMid <= budgetCents) {
    return 1.0 - 0.3 * (creatorMid / budgetCents);
  }

  const overRatio = creatorMid / budgetCents;
  return Math.max(0, 1.0 - (overRatio - 1) * 2);
}

export function reliabilityScore(creator: Creator): number {
  return creator.reliability_score;
}

// --- Penalties ---

export function conflictPenalty(
  creatorDeals: PastDeal[],
  campaignTags: string[],
  getCampaignTags: (campaignId: string) => string[]
): number {
  if (creatorDeals.length === 0) return 1.0;

  for (const deal of creatorDeals) {
    const dealTags = getCampaignTags(deal.campaign_id);
    const jaccard = tagsScore(campaignTags, dealTags);
    if (jaccard > 0.5) {
      return 0.75;
    }
  }

  return 1.0;
}

export function nichePenalty(
  creatorTag: string,
  nicheCount: Map<string, number>
): number {
  const count = nicheCount.get(creatorTag) ?? 0;
  if (count === 0) return 1.0;
  return Math.max(0.55, 1.0 - 0.15 * count);
}

// --- Score computation ---

export function computeBreakdown(
  creator: Creator,
  request: RecommendationRequest,
  stats: GlobalStats
): FitBreakdown {
  return {
    tags: round(tagsScore(request.tags_required, creator.tags)),
    audience_overlap: round(audienceScore(request.audience_target, creator)),
    performance: round(performanceScore(creator, stats)),
    budget_fit: round(budgetScore(creator.price_min, creator.price_max, request.budget_cents)),
    reliability: round(reliabilityScore(creator)),
  };
}

export function computeFinalScore(breakdown: FitBreakdown, penalty: number): number {
  const base =
    WEIGHTS.tags * breakdown.tags +
    WEIGHTS.audience_overlap * breakdown.audience_overlap +
    WEIGHTS.performance * breakdown.performance +
    WEIGHTS.budget_fit * breakdown.budget_fit +
    WEIGHTS.reliability * breakdown.reliability;
  return round(base * penalty);
}

export function generateWhy(breakdown: FitBreakdown, creator: Creator): string {
  const reasons: string[] = [];
  if (breakdown.tags > 0.5) reasons.push(`Tags relevantes (${pct(breakdown.tags)})`);
  if (breakdown.audience_overlap > 0.4) reasons.push(`Boa aderência de audiência (${pct(breakdown.audience_overlap)})`);
  if (breakdown.performance > 0.6) reasons.push(`Alta performance (${pct(breakdown.performance)})`);
  if (breakdown.budget_fit > 0.7) reasons.push(`Preço compatível com orçamento (${pct(breakdown.budget_fit)})`);
  if (breakdown.reliability > 0.8) reasons.push(`Confiável nas entregas (${pct(breakdown.reliability)})`);
  if (reasons.length === 0) reasons.push("Match parcial em múltiplos critérios");
  return reasons.join("; ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
