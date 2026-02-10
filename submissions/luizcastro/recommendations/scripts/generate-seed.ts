/**
 * Deterministic seed data generator for the recommendations service.
 * Uses mulberry32 PRNG for reproducible output.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

// --- Mulberry32 seeded PRNG ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

// --- Helpers ---
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 3): number {
  return Number((rand() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], min: number, max: number): T[] {
  const n = randInt(min, max);
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
}

// --- Data pools ---
const TAGS = [
  "fintech", "fitness", "skincare", "gaming", "food",
  "travel", "tech", "fashion", "music", "education",
];

const AGE_RANGES = [
  { min: 13, max: 17 },
  { min: 18, max: 24 },
  { min: 25, max: 34 },
  { min: 35, max: 44 },
  { min: 45, max: 54 },
];

const COUNTRIES = ["BR", "US", "MX", "AR", "CO", "PT", "ES", "UK", "DE", "FR"];

const FIRST_NAMES_PT = [
  "Lucas", "Gabriel", "Mateus", "Rafael", "Pedro",
  "Juliana", "Camila", "Fernanda", "Bruna", "Larissa",
  "Thiago", "Gustavo", "Felipe", "André", "Marcos",
  "Carolina", "Amanda", "Beatriz", "Isabela", "Letícia",
  "Diego", "Rodrigo", "Vinícius", "Renato", "Leonardo",
  "Mariana", "Tatiana", "Priscila", "Raquel", "Débora",
];

const FIRST_NAMES_EN = [
  "James", "Emma", "Liam", "Olivia", "Noah",
  "Ava", "William", "Sophia", "Mason", "Isabella",
  "Ethan", "Mia", "Alexander", "Charlotte", "Daniel",
  "Harper", "Michael", "Evelyn", "Benjamin", "Abigail",
  "Logan", "Emily", "Jackson", "Madison", "Aiden",
  "Chloe", "Ryan", "Grace", "Nathan", "Zoe",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Pereira",
  "Costa", "Rodrigues", "Almeida", "Nascimento", "Lima",
  "Smith", "Johnson", "Williams", "Brown", "Jones",
  "Garcia", "Martinez", "Anderson", "Taylor", "Thomas",
  "Ferreira", "Carvalho", "Gomes", "Ribeiro", "Martins",
  "Araújo", "Barbosa", "Melo", "Cardoso", "Rocha",
];

// --- Generate creators ---
function generateCreators(count: number) {
  const creators = [];
  const allFirstNames = [...FIRST_NAMES_PT, ...FIRST_NAMES_EN];

  for (let i = 1; i <= count; i++) {
    const id = `creator_${String(i).padStart(3, "0")}`;
    const firstName = pick(allFirstNames);
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;

    const priceMin = randInt(5000, 400000);
    const priceMax = priceMin + randInt(5000, 100000);

    creators.push({
      id,
      name,
      tags: pickN(TAGS, 1, 4),
      audience_age: pickN(AGE_RANGES, 1, 2),
      audience_location: pickN(COUNTRIES, 1, 3),
      avg_views: randInt(5000, 5000000),
      ctr: randFloat(0.005, 0.15),
      cvr: randFloat(0.001, 0.08),
      price_min: priceMin,
      price_max: Math.min(priceMax, 500000),
      reliability_score: randFloat(0.5, 1.0),
    });
  }
  return creators;
}

// --- Generate campaigns ---
function generateCampaigns() {
  const now = Date.now();
  const day = 86400000;

  const templates = [
    {
      id: "campaign_001",
      name: "Fintech Growth",
      goal: "installs",
      tags_required: ["fintech", "tech"],
      audience_target: { age: [{ min: 18, max: 24 }, { min: 25, max: 34 }], locations: ["BR", "MX"] },
      budget_cents: 5000000,
      deadline: new Date(now + 30 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_002",
      name: "Fitness App Launch",
      goal: "installs",
      tags_required: ["fitness"],
      audience_target: { age: [{ min: 18, max: 24 }, { min: 25, max: 34 }], locations: ["BR", "US"] },
      budget_cents: 3000000,
      deadline: new Date(now + 21 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_003",
      name: "D2C Skincare Brasil",
      goal: "conversions",
      tags_required: ["skincare", "fashion"],
      audience_target: { age: [{ min: 25, max: 34 }, { min: 35, max: 44 }], locations: ["BR", "PT"] },
      budget_cents: 7000000,
      deadline: new Date(now + 45 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_004",
      name: "Gaming Awareness Blitz",
      goal: "awareness",
      tags_required: ["gaming", "tech"],
      audience_target: { age: [{ min: 13, max: 17 }, { min: 18, max: 24 }], locations: ["BR", "US", "MX"] },
      budget_cents: 10000000,
      deadline: new Date(now + 60 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_005",
      name: "Food Delivery Expansion",
      goal: "conversions",
      tags_required: ["food"],
      audience_target: { age: [{ min: 18, max: 24 }, { min: 25, max: 34 }], locations: ["BR", "AR", "CO"] },
      budget_cents: 4000000,
      deadline: new Date(now + 25 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_006",
      name: "Travel Engagement",
      goal: "engagement",
      tags_required: ["travel"],
      audience_target: { age: [{ min: 25, max: 34 }, { min: 35, max: 44 }], locations: ["BR", "PT", "ES"] },
      budget_cents: 2000000,
      deadline: new Date(now + 35 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_007",
      name: "EdTech Platform Launch",
      goal: "installs",
      tags_required: ["education", "tech"],
      audience_target: { age: [{ min: 18, max: 24 }, { min: 25, max: 34 }], locations: ["BR", "US", "UK"] },
      budget_cents: 6000000,
      deadline: new Date(now + 40 * day).toISOString().split("T")[0],
    },
    {
      id: "campaign_008",
      name: "Fashion Brand Awareness",
      goal: "awareness",
      tags_required: ["fashion", "skincare"],
      audience_target: { age: [{ min: 18, max: 24 }, { min: 25, max: 34 }, { min: 35, max: 44 }], locations: ["BR", "FR", "DE"] },
      budget_cents: 8000000,
      deadline: new Date(now + 50 * day).toISOString().split("T")[0],
    },
  ];

  return templates;
}

// --- Generate past deals ---
function generatePastDeals(count: number, creatorIds: string[], campaignIds: string[]) {
  const deals = [];

  for (let i = 1; i <= count; i++) {
    const creatorId = pick(creatorIds);
    const campaignId = pick(campaignIds);
    const deliveredOnTime = rand() < 0.8;
    const performanceScore = randFloat(0.3, 1.0, 2);

    deals.push({
      id: `deal_${String(i).padStart(3, "0")}`,
      creator_id: creatorId,
      campaign_id: campaignId,
      delivered_on_time: deliveredOnTime,
      performance_score: performanceScore,
    });
  }

  return deals;
}

// --- Main ---
const seedDir = join(import.meta.dir, "..", "seed");

const creators = generateCreators(150);
const campaigns = generateCampaigns();
const creatorIds = creators.map((c) => c.id);
const campaignIds = campaigns.map((c) => c.id);
const pastDeals = generatePastDeals(80, creatorIds, campaignIds);

writeFileSync(join(seedDir, "creators.json"), JSON.stringify(creators, null, 2) + "\n");
writeFileSync(join(seedDir, "campaigns.json"), JSON.stringify(campaigns, null, 2) + "\n");
writeFileSync(join(seedDir, "past-deals.json"), JSON.stringify(pastDeals, null, 2) + "\n");

console.log(`Generated ${creators.length} creators`);
console.log(`Generated ${campaigns.length} campaigns`);
console.log(`Generated ${pastDeals.length} past deals`);
console.log(`Files written to ${seedDir}`);
