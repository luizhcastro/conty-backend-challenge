import { t } from "elysia";

export const creator = t.Object({
  id: t.String(),
  name: t.String(),
  tags: t.Array(t.String()),
  audience_age: t.Array(
    t.Object({ min: t.Number(), max: t.Number() })
  ),
  audience_location: t.Array(t.String()),
  avg_views: t.Number(),
  ctr: t.Number(),
  cvr: t.Number(),
  price_min: t.Number(),
  price_max: t.Number(),
  reliability_score: t.Number(),
});

export type Creator = typeof creator.static;
