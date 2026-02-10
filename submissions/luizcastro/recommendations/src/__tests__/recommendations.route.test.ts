import { describe, it, expect, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { recommendationsRoutes } from "../routes/recommendations";
import { creatorStore } from "../store/creator.store";
import { campaignStore } from "../store/campaign.store";
import { pastDealStore } from "../store/past-deal.store";

const app = new Elysia().use(recommendationsRoutes);

const postRecommendations = (body: unknown) =>
  app.handle(
    new Request("http://localhost/recommendations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

const validBody = {
  goal: "installs",
  tags_required: ["fintech"],
  audience_target: {
    country: ["BR"],
    age_range: [{ min: 20, max: 34 }],
  },
  budget_cents: 5000000,
  deadline: "2025-10-30",
};

describe("POST /recommendations", () => {
  beforeEach(() => {
    creatorStore.loadSeed();
    campaignStore.loadSeed();
    pastDealStore.loadSeed();
  });

  it("returns 200 with valid request", async () => {
    const res = await postRecommendations(validBody);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.recommendations).toBeDefined();
    expect(json.metadata).toBeDefined();
    expect(json.recommendations.length).toBeGreaterThan(0);
  });

  it("returns 422 for invalid body", async () => {
    const res = await postRecommendations({ invalid: true });
    expect(res.status).toBe(422);
  });

  it("returns 422 for missing required fields", async () => {
    const res = await postRecommendations({ goal: "installs" });
    expect(res.status).toBe(422);
  });

  it("respects top_k parameter", async () => {
    const res = await postRecommendations({ ...validBody, top_k: 3 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.recommendations.length).toBe(3);
  });

  it("returns results with score and fit_breakdown", async () => {
    const res = await postRecommendations(validBody);
    const json = await res.json();
    const first = json.recommendations[0];
    expect(first.score).toBeGreaterThan(0);
    expect(first.fit_breakdown.tags).toBeDefined();
    expect(first.why).toBeDefined();
  });
});
