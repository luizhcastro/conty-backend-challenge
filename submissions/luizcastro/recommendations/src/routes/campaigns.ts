import { Elysia, t } from "elysia";
import { campaignStore } from "../store/campaign.store";
import { campaign } from "../types/campaign.types";

export const campaignsRoutes = new Elysia()
  .get(
    "/campaigns",
    () => {
      return campaignStore.getAll();
    },
    {
      response: {
        200: t.Array(campaign),
      },
    },
  );
