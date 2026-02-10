import type { Campaign } from "../types/campaign.types";
import seedData from "../seed/campaigns.json";

const store = new Map<string, Campaign>();

export const campaignStore = {
  getAll: (): Campaign[] => [...store.values()],
  get: (id: string): Campaign | undefined => store.get(id),
  size: (): number => store.size,
  loadSeed: (): void => {
    store.clear();
    for (const item of seedData as Campaign[]) {
      store.set(item.id, item);
    }
  },
  clear: (): void => store.clear(),
};
