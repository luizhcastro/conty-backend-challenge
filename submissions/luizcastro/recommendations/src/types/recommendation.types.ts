import { t } from "elysia";

export const recommendationRequest = t.Object({
  goal: t.String(),
  tags_required: t.Array(t.String()),
  audience_target: t.Object({
    country: t.Array(t.String()),
    age_range: t.Array(
      t.Object({ min: t.Number(), max: t.Number() })
    ),
  }),
  budget_cents: t.Number({ minimum: 0 }),
  deadline: t.String(),
  top_k: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  diversity: t.Optional(t.Boolean()),
});

export type RecommendationRequest = typeof recommendationRequest.static;

export const fitBreakdown = t.Object({
  tags: t.Number(),
  audience_overlap: t.Number(),
  performance: t.Number(),
  budget_fit: t.Number(),
  reliability: t.Number(),
});

export type FitBreakdown = typeof fitBreakdown.static;

export const scoredCreator = t.Object({
  creator_id: t.String(),
  score: t.Number(),
  fit_breakdown: fitBreakdown,
  why: t.String(),
});

export type ScoredCreator = typeof scoredCreator.static;

export const recommendationResponse = t.Object({
  recommendations: t.Array(scoredCreator),
  metadata: t.Object({
    total_creators: t.Number(),
    scoring_version: t.String(),
  }),
});

export type RecommendationResponse = typeof recommendationResponse.static;

export const errorResponse = t.Object({
  error: t.String(),
  details: t.Optional(t.String()),
});

export type ErrorResponse = typeof errorResponse.static;
