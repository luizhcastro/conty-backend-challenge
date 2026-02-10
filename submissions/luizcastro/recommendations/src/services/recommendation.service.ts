import type { RecommendationRequest, RecommendationResponse, ScoredCreator } from "../types/recommendation.types";
import { creatorStore } from "../store/creator.store";
import { campaignStore } from "../store/campaign.store";
import { pastDealStore } from "../store/past-deal.store";
import {
  computeBreakdown,
  computeFinalScore,
  computeGlobalStats,
  conflictPenalty,
  generateWhy,
  nichePenalty,
  SCORING_VERSION,
} from "./scoring.service";

export function getRecommendations(request: RecommendationRequest): RecommendationResponse {
  const creators = creatorStore.getAll();
  const topK = request.top_k ?? 10;
  const diversity = request.diversity ?? false;
  const stats = computeGlobalStats(creators);

  const getCampaignTags = (campaignId: string): string[] =>
    campaignStore.get(campaignId)?.tags_required ?? [];

  let scored: Array<ScoredCreator & { primaryTag: string }> = creators.map((creator) => {
    const breakdown = computeBreakdown(creator, request, stats);
    const creatorDeals = pastDealStore.getByCreator(creator.id);
    const penalty = conflictPenalty(creatorDeals, request.tags_required, getCampaignTags);
    const score = computeFinalScore(breakdown, penalty);

    return {
      creator_id: creator.id,
      score,
      fit_breakdown: breakdown,
      why: generateWhy(breakdown, creator),
      primaryTag: creator.tags[0] ?? "unknown",
    };
  });

  scored.sort((a, b) => b.score - a.score);

  if (diversity) {
    const nicheCount = new Map<string, number>();
    scored = scored.map((item) => {
      const penalty = nichePenalty(item.primaryTag, nicheCount);
      nicheCount.set(item.primaryTag, (nicheCount.get(item.primaryTag) ?? 0) + 1);
      return {
        ...item,
        score: Math.round(item.score * penalty * 100) / 100,
      };
    });
    scored.sort((a, b) => b.score - a.score);
  }

  const results: ScoredCreator[] = scored.slice(0, topK).map(({ primaryTag, ...rest }) => rest);

  return {
    recommendations: results,
    metadata: {
      total_creators: creators.length,
      scoring_version: SCORING_VERSION,
    },
  };
}
