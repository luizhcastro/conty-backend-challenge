import type { Creator } from "../types/creator.types";
import seedData from "../seed/creators.json";

const store = new Map<string, Creator>();

export const creatorStore = {
  getAll: (): Creator[] => [...store.values()],
  get: (id: string): Creator | undefined => store.get(id),
  size: (): number => store.size,
  loadSeed: (): void => {
    store.clear();
    for (const item of seedData as Creator[]) {
      store.set(item.id, item);
    }
  },
  clear: (): void => store.clear(),
};
