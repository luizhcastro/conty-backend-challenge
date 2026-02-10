import { describe, it, expect, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { campaignsRoutes } from "../routes/campaigns";
import { campaignStore } from "../store/campaign.store";

const app = new Elysia().use(campaignsRoutes);

describe("GET /campaigns", () => {
  beforeEach(() => {
    campaignStore.loadSeed();
  });

  it("returns all campaigns", async () => {
    const res = await app.handle(new Request("http://localhost/campaigns"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.length).toBe(8);
  });

  it("returns campaigns with expected fields", async () => {
    const res = await app.handle(new Request("http://localhost/campaigns"));
    const json = await res.json();
    const first = json[0];
    expect(first.id).toBeDefined();
    expect(first.brand).toBeDefined();
    expect(first.goal).toBeDefined();
    expect(first.tags_required).toBeDefined();
    expect(first.budget_cents).toBeDefined();
  });
});
