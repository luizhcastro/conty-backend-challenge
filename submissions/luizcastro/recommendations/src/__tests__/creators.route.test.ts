import { describe, it, expect, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { creatorsRoutes } from "../routes/creators";
import { creatorStore } from "../store/creator.store";

const app = new Elysia().use(creatorsRoutes);

describe("GET /creators", () => {
  beforeEach(() => {
    creatorStore.loadSeed();
  });

  it("returns all creators", async () => {
    const res = await app.handle(new Request("http://localhost/creators"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.length).toBe(150);
  });

  it("filters by tag", async () => {
    const res = await app.handle(new Request("http://localhost/creators?tag=fintech"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.length).toBeGreaterThan(0);
    for (const creator of json) {
      expect(creator.tags).toContain("fintech");
    }
  });

  it("filters by country", async () => {
    const res = await app.handle(new Request("http://localhost/creators?country=BR"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.length).toBeGreaterThan(0);
    for (const creator of json) {
      expect(creator.audience_location).toContain("BR");
    }
  });

  it("returns empty array for non-matching filter", async () => {
    const res = await app.handle(new Request("http://localhost/creators?tag=nonexistent"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.length).toBe(0);
  });
});
