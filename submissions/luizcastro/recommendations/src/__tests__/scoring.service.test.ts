import { describe, it, expect } from "bun:test";
import {
  tagsScore,
  countryScore,
  ageOverlapScore,
  audienceScore,
  performanceScore,
  budgetScore,
  reliabilityScore,
  normalize,
  computeGlobalStats,
  computeBreakdown,
  computeFinalScore,
  conflictPenalty,
  nichePenalty,
  generateWhy,
  WEIGHTS,
} from "../services/scoring.service";
import type { Creator } from "../types/creator.types";
import type { GlobalStats } from "../services/scoring.service";

// --- Tags ---

describe("tagsScore", () => {
  it("returns 1 for identical sets", () => {
    expect(tagsScore(["fintech", "tech"], ["fintech", "tech"])).toBe(1);
  });

  it("returns 0 for no overlap", () => {
    expect(tagsScore(["fintech"], ["fitness"])).toBe(0);
  });

  it("returns correct Jaccard for partial overlap", () => {
    // intersection=1 (fintech), union=3 (fintech, tech, fitness) => 1/3
    const score = tagsScore(["fintech", "tech"], ["fintech", "fitness"]);
    expect(score).toBeCloseTo(1 / 3, 5);
  });

  it("returns 0 for empty arrays", () => {
    expect(tagsScore([], [])).toBe(0);
  });

  it("returns 0 when one array is empty", () => {
    expect(tagsScore(["fintech"], [])).toBe(0);
  });
});

// --- Country ---

describe("countryScore", () => {
  it("returns 1 for exact match", () => {
    expect(countryScore(["BR"], ["BR", "US"])).toBe(1);
  });

  it("returns 0 for no match", () => {
    expect(countryScore(["BR"], ["US", "MX"])).toBe(0);
  });

  it("returns 0.5 for partial match", () => {
    expect(countryScore(["BR", "US"], ["BR"])).toBe(0.5);
  });

  it("returns 0 for empty campaign countries", () => {
    expect(countryScore([], ["BR"])).toBe(0);
  });
});

// --- Age overlap ---

describe("ageOverlapScore", () => {
  it("returns 1 for identical ranges", () => {
    expect(ageOverlapScore([{ min: 20, max: 34 }], [{ min: 20, max: 34 }])).toBe(1);
  });

  it("returns 0 for no overlap", () => {
    expect(ageOverlapScore([{ min: 18, max: 24 }], [{ min: 35, max: 44 }])).toBe(0);
  });

  it("returns correct overlap for partial ranges", () => {
    // campaign: 20-30, creator: 25-40 => intersection: 25-30 (6), union: 20-40 (21) => 6/21
    const score = ageOverlapScore([{ min: 20, max: 30 }], [{ min: 25, max: 40 }]);
    expect(score).toBeCloseTo(6 / 21, 5);
  });

  it("returns 0 for empty ranges", () => {
    expect(ageOverlapScore([], [])).toBe(0);
  });
});

// --- Performance ---

describe("performanceScore", () => {
  const stats: GlobalStats = {
    minViews: 1000,
    maxViews: 100000,
    minCtr: 0.01,
    maxCtr: 0.10,
    minCvr: 0.005,
    maxCvr: 0.05,
  };

  it("returns ~1 for max values", () => {
    const creator = makeCreator({ avg_views: 100000, ctr: 0.10, cvr: 0.05 });
    expect(performanceScore(creator, stats)).toBeCloseTo(1, 5);
  });

  it("returns ~0 for min values", () => {
    const creator = makeCreator({ avg_views: 1000, ctr: 0.01, cvr: 0.005 });
    expect(performanceScore(creator, stats)).toBeCloseTo(0, 5);
  });

  it("returns 0.5 when all stats are equal", () => {
    const equalStats: GlobalStats = {
      minViews: 5000,
      maxViews: 5000,
      minCtr: 0.05,
      maxCtr: 0.05,
      minCvr: 0.02,
      maxCvr: 0.02,
    };
    const creator = makeCreator({ avg_views: 5000, ctr: 0.05, cvr: 0.02 });
    expect(performanceScore(creator, equalStats)).toBeCloseTo(0.5, 5);
  });
});

// --- Budget ---

describe("budgetScore", () => {
  it("returns high score when price is well under budget", () => {
    expect(budgetScore(1000, 2000, 100000)).toBeGreaterThan(0.9);
  });

  it("returns lower score as price approaches budget", () => {
    const low = budgetScore(1000, 2000, 100000);
    const high = budgetScore(80000, 90000, 100000);
    expect(low).toBeGreaterThan(high);
  });

  it("returns 0 when price exceeds budget significantly", () => {
    expect(budgetScore(200000, 300000, 100000)).toBe(0);
  });

  it("returns 0 for zero budget", () => {
    expect(budgetScore(1000, 2000, 0)).toBe(0);
  });
});

// --- Reliability ---

describe("reliabilityScore", () => {
  it("returns the reliability_score directly", () => {
    const creator = makeCreator({ reliability_score: 0.85 });
    expect(reliabilityScore(creator)).toBe(0.85);
  });
});

// --- Normalize ---

describe("normalize", () => {
  it("returns 0 for min value", () => {
    expect(normalize(0, 0, 100)).toBe(0);
  });

  it("returns 1 for max value", () => {
    expect(normalize(100, 0, 100)).toBe(1);
  });

  it("returns 0.5 when min equals max", () => {
    expect(normalize(50, 50, 50)).toBe(0.5);
  });
});

// --- Conflict penalty ---

describe("conflictPenalty", () => {
  it("returns 1.0 with no deals", () => {
    expect(conflictPenalty([], ["fintech"], () => [])).toBe(1.0);
  });

  it("returns 0.75 when deal has >50% tag overlap", () => {
    const deals = [{ id: "d1", creator_id: "c1", campaign_id: "camp1", delivered_on_time: true, performance_score: 0.8 }];
    const getCampaignTags = () => ["fintech", "tech"];
    expect(conflictPenalty(deals, ["fintech", "tech"], getCampaignTags)).toBe(0.75);
  });

  it("returns 1.0 when deal has <=50% tag overlap", () => {
    const deals = [{ id: "d1", creator_id: "c1", campaign_id: "camp1", delivered_on_time: true, performance_score: 0.8 }];
    const getCampaignTags = () => ["fitness", "food", "travel"];
    expect(conflictPenalty(deals, ["fintech"], getCampaignTags)).toBe(1.0);
  });
});

// --- Niche penalty ---

describe("nichePenalty", () => {
  it("returns 1.0 for first creator in niche", () => {
    expect(nichePenalty("fintech", new Map())).toBe(1.0);
  });

  it("returns 0.85 for second creator in same niche", () => {
    const counts = new Map([["fintech", 1]]);
    expect(nichePenalty("fintech", counts)).toBe(0.85);
  });

  it("caps penalty at 0.55", () => {
    const counts = new Map([["fintech", 10]]);
    expect(nichePenalty("fintech", counts)).toBe(0.55);
  });
});

// --- Final score ---

describe("computeFinalScore", () => {
  it("computes weighted sum correctly", () => {
    const breakdown = {
      tags: 1.0,
      audience_overlap: 1.0,
      performance: 1.0,
      budget_fit: 1.0,
      reliability: 1.0,
    };
    const score = computeFinalScore(breakdown, 1.0);
    expect(score).toBe(1.0);
  });

  it("applies penalty multiplier", () => {
    const breakdown = {
      tags: 1.0,
      audience_overlap: 1.0,
      performance: 1.0,
      budget_fit: 1.0,
      reliability: 1.0,
    };
    const score = computeFinalScore(breakdown, 0.75);
    expect(score).toBe(0.75);
  });
});

// --- Generate why ---

describe("generateWhy", () => {
  it("includes relevant reasons for high scores", () => {
    const breakdown = {
      tags: 0.8,
      audience_overlap: 0.6,
      performance: 0.7,
      budget_fit: 0.9,
      reliability: 0.9,
    };
    const why = generateWhy(breakdown, makeCreator({}));
    expect(why).toContain("Tags relevantes");
    expect(why).toContain("audiência");
    expect(why).toContain("performance");
    expect(why).toContain("orçamento");
    expect(why).toContain("Confiável");
  });

  it("returns fallback for low scores", () => {
    const breakdown = {
      tags: 0.1,
      audience_overlap: 0.1,
      performance: 0.1,
      budget_fit: 0.1,
      reliability: 0.1,
    };
    const why = generateWhy(breakdown, makeCreator({}));
    expect(why).toContain("Match parcial");
  });
});

// --- Helper ---

function makeCreator(overrides: Partial<Creator>): Creator {
  return {
    id: "c1",
    name: "Test Creator",
    tags: ["fintech"],
    audience_age: [{ min: 18, max: 34 }],
    audience_location: ["BR"],
    avg_views: 50000,
    ctr: 0.05,
    cvr: 0.02,
    price_min: 10000,
    price_max: 20000,
    reliability_score: 0.8,
    ...overrides,
  };
}
