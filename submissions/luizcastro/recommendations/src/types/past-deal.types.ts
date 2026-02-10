import { t } from "elysia";

export const pastDeal = t.Object({
  id: t.String(),
  creator_id: t.String(),
  campaign_id: t.String(),
  delivered_on_time: t.Boolean(),
  performance_score: t.Number(),
});

export type PastDeal = typeof pastDeal.static;
