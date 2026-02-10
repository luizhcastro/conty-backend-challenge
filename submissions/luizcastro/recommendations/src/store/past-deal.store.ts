import type { PastDeal } from "../types/past-deal.types";
import seedData from "../seed/past-deals.json";

const store = new Map<string, PastDeal>();
const byCreator = new Map<string, PastDeal[]>();

export const pastDealStore = {
  getAll: (): PastDeal[] => [...store.values()],
  get: (id: string): PastDeal | undefined => store.get(id),
  getByCreator: (creatorId: string): PastDeal[] =>
    byCreator.get(creatorId) ?? [],
  size: (): number => store.size,
  loadSeed: (): void => {
    store.clear();
    byCreator.clear();
    for (const item of seedData as PastDeal[]) {
      store.set(item.id, item);
      const existing = byCreator.get(item.creator_id) ?? [];
      existing.push(item);
      byCreator.set(item.creator_id, existing);
    }
  },
  clear: (): void => {
    store.clear();
    byCreator.clear();
  },
};
