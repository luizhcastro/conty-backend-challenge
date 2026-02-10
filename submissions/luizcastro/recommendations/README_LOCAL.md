# Desafio Conty – Recomendação de Campanhas → Criadores

> **Local da submissão:** `submissions/luizcastro/recommendations`

## Como rodar

### Sem Docker

```bash
cd submissions/luizcastro/recommendations
bun install
bun run start        # produção (porta 8080)
bun run dev          # watch mode
```

### Com Docker

```bash
cd submissions/luizcastro/recommendations
docker compose up --build
```

### Requisitos

- **Bun** >= 1.3 (ou Docker)
- Sem dependência de banco de dados (in-memory com seed JSON)

## Endpoints

### POST /recommendations

Retorna ranking de criadores para uma campanha.

**Request:**

```bash
curl -X POST http://localhost:8080/recommendations \
  -H "content-type: application/json" \
  -d '{
    "goal": "installs",
    "tags_required": ["fintech", "investimentos"],
    "audience_target": {
      "country": ["BR"],
      "age_range": [{"min": 20, "max": 34}]
    },
    "budget_cents": 5000000,
    "deadline": "2025-10-30",
    "top_k": 5,
    "diversity": true
  }'
```

**Response:**

```json
{
  "recommendations": [
    {
      "creator_id": "creator_078",
      "score": 0.85,
      "fit_breakdown": {
        "tags": 1.0,
        "audience_overlap": 0.7,
        "performance": 0.62,
        "budget_fit": 0.99,
        "reliability": 0.99
      },
      "why": "Tags relevantes (100%); Boa aderência de audiência (70%); Alta performance (62%); Preço compatível com orçamento (99%); Confiável nas entregas (99%)"
    }
  ],
  "metadata": {
    "total_creators": 150,
    "scoring_version": "1.0"
  }
}
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `goal` | string | sim | Objetivo da campanha (installs, conversions, awareness, engagement) |
| `tags_required` | string[] | sim | Tags desejadas para o criador |
| `audience_target.country` | string[] | sim | Países alvo |
| `audience_target.age_range` | {min, max}[] | sim | Faixas etárias alvo |
| `budget_cents` | number | sim | Orçamento em centavos |
| `deadline` | string | sim | Data limite (ISO) |
| `top_k` | number | não | Quantidade de resultados (default: 10, max: 100) |
| `diversity` | boolean | não | Penalizar saturação de nicho (default: false) |

### GET /creators

Lista criadores com filtros opcionais.

```bash
curl "http://localhost:8080/creators?tag=fintech&country=BR"
```

### GET /campaigns

Lista todas as campanhas do seed.

```bash
curl http://localhost:8080/campaigns
```

## Arquitetura

```
src/
├── index.ts                    # Entry point, carrega seeds e inicia servidor
├── types/                      # Schemas TypeBox (validação + tipos)
│   ├── creator.types.ts
│   ├── campaign.types.ts
│   ├── past-deal.types.ts
│   └── recommendation.types.ts
├── store/                      # In-memory stores (Map) com loadSeed()
│   ├── creator.store.ts
│   ├── campaign.store.ts
│   └── past-deal.store.ts
├── seed/                       # Dados fictícios (JSON estático)
│   ├── creators.json           # 150 criadores
│   ├── campaigns.json          # 8 campanhas
│   └── past-deals.json         # 80 deals históricos
├── services/
│   ├── scoring.service.ts      # Motor de scoring (funções puras)
│   └── recommendation.service.ts # Orquestração
└── routes/
    ├── recommendations.ts      # POST /recommendations
    ├── creators.ts             # GET /creators
    └── campaigns.ts            # GET /campaigns
```

### Decisões e trade-offs

- **In-memory storage**: Sem banco de dados para simplicidade. Seeds carregados na inicialização.
- **Scoring determinístico**: Sem ML, sem randomness. Mesma entrada = mesma saída.
- **TypeBox validation**: Schemas compilados para validação rápida com tipos TypeScript inferidos.
- **Funções puras no scoring**: Cada dimensão é uma função isolada, testável individualmente.

### O que faria diferente com mais tempo

- Banco de dados (PostgreSQL) para persistência e queries complexas
- Paginação nos endpoints GET
- Cache do `GlobalStats` para não recalcular a cada request
- Scoring com pesos configuráveis via API
- Filtros avançados (excluir criadores, faixa de preço, etc.)

## Modelo de Scoring

Score final = soma ponderada de 5 dimensões, multiplicada por penalidades.

### Dimensões e pesos

| Dimensão | Peso | Algoritmo |
|---|---|---|
| **Tags** | 0.30 | Jaccard similarity: `\|A ∩ B\| / \|A ∪ B\|` |
| **Audiência** | 0.25 | 50% country match + 50% age range overlap (Jaccard) |
| **Performance** | 0.20 | Min-max normalization de avg_views, CTR, CVR → média |
| **Budget fit** | 0.15 | Decai conforme preço médio do criador se aproxima/excede budget |
| **Reliability** | 0.10 | reliability_score direto (já normalizado [0,1]) |

### Normalizações

- **Tags**: Jaccard sobre sets de strings → [0, 1]
- **Country**: proporção de países da campanha presentes no criador → [0, 1]
- **Age**: Jaccard sobre conjuntos de idades inteiras → [0, 1]
- **Performance**: min-max relativo a todos os criadores → [0, 1]
- **Budget**: score 1.0 para preço muito abaixo, decai linearmente → [0, 1]

### Penalidades

- **Conflito** (×0.75): Criador com deal em campanha de tags similares (Jaccard >50%)
- **Saturação de nicho** (×0.85 por repetição, quando `diversity=true`): Evita concentrar criadores do mesmo nicho no topo

### Fórmula

```
base = 0.30×tags + 0.25×audience + 0.20×performance + 0.15×budget + 0.10×reliability
final = base × conflict_penalty × niche_penalty
```

## Testes

```bash
bun test
```

**54 testes** cobrindo:

- **scoring.service.test.ts** (33 testes): Cada dimensão isolada, normalização, penalidades, score final, geração de "why"
- **recommendation.service.test.ts** (9 testes): top_k, diversity, ordenação, metadata, edge cases
- **recommendations.route.test.ts** (5 testes): HTTP 200/422, validação, fit_breakdown
- **creators.route.test.ts** (4 testes): GET com filtros, lista completa
- **campaigns.route.test.ts** (3 testes): GET lista completa, campos esperados

## IA/Libraries

- **Elysia.js**: Framework HTTP com TypeBox integrado
- **Bun**: Runtime e test runner
- Código de scoring e lógica de negócio escritos do zero
- Seed data gerado via script determinístico (mulberry32 PRNG)
- IA utilizada para auxiliar na geração de código e estruturação do projeto
