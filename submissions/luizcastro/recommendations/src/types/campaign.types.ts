import { t } from "elysia";

export const campaign = t.Object({
  id: t.String(),
  brand: t.String(),
  goal: t.String(),
  tags_required: t.Array(t.String()),
  audience_target: t.Object({
    country: t.Array(t.String()),
    age_range: t.Array(
      t.Object({ min: t.Number(), max: t.Number() })
    ),
  }),
  budget_cents: t.Number(),
  deadline: t.String(),
});

export type Campaign = typeof campaign.static;
