import { describe, it, expect, beforeEach } from "bun:test";
import { getRecommendations } from "../services/recommendation.service";
import { creatorStore } from "../store/creator.store";
import { campaignStore } from "../store/campaign.store";
import { pastDealStore } from "../store/past-deal.store";
import type { RecommendationRequest } from "../types/recommendation.types";

const baseRequest: RecommendationRequest = {
  goal: "installs",
  tags_required: ["fintech"],
  audience_target: {
    country: ["BR"],
    age_range: [{ min: 20, max: 34 }],
  },
  budget_cents: 5000000,
  deadline: "2025-10-30",
};

describe("getRecommendations", () => {
  beforeEach(() => {
    creatorStore.loadSeed();
    campaignStore.loadSeed();
    pastDealStore.loadSeed();
  });

  it("returns up to default top_k (10) results", () => {
    const result = getRecommendations(baseRequest);
    expect(result.recommendations.length).toBeLessThanOrEqual(10);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("respects custom top_k", () => {
    const result = getRecommendations({ ...baseRequest, top_k: 3 });
    expect(result.recommendations.length).toBe(3);
  });

  it("returns results sorted by score descending", () => {
    const result = getRecommendations(baseRequest);
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i]!.score).toBeLessThanOrEqual(
        result.recommendations[i - 1]!.score
      );
    }
  });

  it("includes metadata with total_creators and scoring_version", () => {
    const result = getRecommendations(baseRequest);
    expect(result.metadata.total_creators).toBe(150);
    expect(result.metadata.scoring_version).toBe("1.0");
  });

  it("includes fit_breakdown with all dimensions", () => {
    const result = getRecommendations(baseRequest);
    const first = result.recommendations[0]!;
    expect(first.fit_breakdown).toHaveProperty("tags");
    expect(first.fit_breakdown).toHaveProperty("audience_overlap");
    expect(first.fit_breakdown).toHaveProperty("performance");
    expect(first.fit_breakdown).toHaveProperty("budget_fit");
    expect(first.fit_breakdown).toHaveProperty("reliability");
  });

  it("includes non-empty why for each result", () => {
    const result = getRecommendations(baseRequest);
    for (const rec of result.recommendations) {
      expect(rec.why.length).toBeGreaterThan(0);
    }
  });

  it("diversity=true produces different ordering than diversity=false", () => {
    const withoutDiversity = getRecommendations({ ...baseRequest, top_k: 20 });
    const withDiversity = getRecommendations({ ...baseRequest, top_k: 20, diversity: true });

    const idsWithout = withoutDiversity.recommendations.map((r) => r.creator_id);
    const idsWith = withDiversity.recommendations.map((r) => r.creator_id);

    // They should not be identical when diversity is applied
    const same = idsWithout.every((id, i) => id === idsWith[i]);
    expect(same).toBe(false);
  });

  it("returns empty results for empty creator store", () => {
    creatorStore.clear();
    const result = getRecommendations(baseRequest);
    expect(result.recommendations).toHaveLength(0);
    expect(result.metadata.total_creators).toBe(0);
  });

  it("handles empty tags_required gracefully", () => {
    const result = getRecommendations({ ...baseRequest, tags_required: [] });
    expect(result.recommendations.length).toBeGreaterThan(0);
    // All tags scores should be 0
    for (const rec of result.recommendations) {
      expect(rec.fit_breakdown.tags).toBe(0);
    }
  });
});
