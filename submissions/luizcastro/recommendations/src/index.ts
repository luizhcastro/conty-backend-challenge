import { Elysia } from "elysia";
import { recommendationsRoutes } from "./routes/recommendations";
import { creatorsRoutes } from "./routes/creators";
import { campaignsRoutes } from "./routes/campaigns";
import { creatorStore } from "./store/creator.store";
import { campaignStore } from "./store/campaign.store";
import { pastDealStore } from "./store/past-deal.store";

creatorStore.loadSeed();
campaignStore.loadSeed();
pastDealStore.loadSeed();

const app = new Elysia()
  .use(recommendationsRoutes)
  .use(creatorsRoutes)
  .use(campaignsRoutes)
  .listen(8080);

console.log(`Server running at http://localhost:${app.server?.port}`);
