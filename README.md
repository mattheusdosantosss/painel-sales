# Painel de Sales · Demandas Performance | MKT

Acompanhamento, no padrão visual da **PSA**, de todas as demandas do time de Sales
no pipeline **Performance | MKT** do HubSpot.

Lista os tickets cujo **Área do solicitante** é uma destas:
`Comercial`, `Comercial | B2B`, `Comercial | B2C`, `Farmer | B2B`, `CS | B2B`, `CS | B2C`.

Colunas (espelham a visão do HubSpot): **Nome do ticket · Status · Área do
solicitante · Proprietário · Solicitante · E-mail do solicitante · Data prevista
de entrega**. Tem busca, filtros por área, status e proprietário, ordenação por
coluna, KPIs e gráficos por status e por área.

O **Proprietário** é o "Proprietário do ticket" do HubSpot (`hubspot_owner_id`),
resolvido para nome via API de owners.

Sem `HUBSPOT_TOKEN` ele já renderiza com um **snapshot real** do HubSpot (seed).
Com o token, fica **ao vivo** — inclusive os rótulos e a ordem dos status vêm
direto do pipeline.

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencha o HUBSPOT_TOKEN
npm run dev
```

## Deploy na Vercel

1. Suba este projeto num repo (ex.: `painel-sales`).
2. Na Vercel: New Project → importe o repo.
3. Em **Settings → Environment Variables**:
   - `HUBSPOT_TOKEN` = token de Private App
     (scopes: `crm.objects.tickets.read` + `crm.objects.owners.read`).
   - (opcional) `HUBSPOT_TICKETS_PIPELINE` e `HUBSPOT_AREAS` se mudarem no HubSpot.
4. Deploy.

## Onde está cada coisa

- `lib/hubspot.ts` — busca os estágios do pipeline (id → rótulo/ordem) e os
  tickets filtrados por pipeline + área.
- `lib/seed.ts` — snapshot real (fallback sem token).
- `lib/tickets.ts` — junta tudo (ao vivo ou seed) e monta o objeto do painel.
- `components/Dashboard.tsx` — UI (KPIs, gráficos, tabela).
- `app/api/tickets/route.ts` — endpoint que o botão "Atualizar" consome.

## Notas

- O token **nunca** vai no código — só em env var.
- Pipeline "Performance | MKT" = `794615341`. A propriedade da área é
  `area_do_solicitante`; e-mail é `e_mail_do_solicitante`; entrega é
  `data_prevista_de_entrega`.
