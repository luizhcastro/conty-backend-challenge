import { Elysia, t } from "elysia";
import { creatorStore } from "../store/creator.store";
import { creator } from "../types/creator.types";

export const creatorsRoutes = new Elysia()
  .get(
    "/creators",
    ({ query }) => {
      let results = creatorStore.getAll();

      if (query.tag) {
        results = results.filter((c) => c.tags.includes(query.tag!));
      }
      if (query.country) {
        results = results.filter((c) => c.audience_location.includes(query.country!));
      }

      return results;
    },
    {
      query: t.Object({
        tag: t.Optional(t.String()),
        country: t.Optional(t.String()),
      }),
      response: {
        200: t.Array(creator),
      },
    },
  );
