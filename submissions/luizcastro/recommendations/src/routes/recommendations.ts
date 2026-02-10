import { Elysia } from "elysia";
import { getRecommendations } from "../services/recommendation.service";
import {
  recommendationRequest,
  recommendationResponse,
  errorResponse,
} from "../types/recommendation.types";

export const recommendationsRoutes = new Elysia()
  .onError(({ code, error, status }) => {
    if (code === "VALIDATION") {
      return status(422, { error: "Validation failed", details: error.message });
    }

    return status(500, { error: "Internal server error" });
  })
  .post(
    "/recommendations",
    ({ body }) => {
      return getRecommendations(body);
    },
    {
      body: recommendationRequest,
      response: {
        200: recommendationResponse,
        422: errorResponse,
        500: errorResponse,
      },
    },
  );
