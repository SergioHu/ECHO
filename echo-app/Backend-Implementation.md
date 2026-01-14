# PROJECT ECHO – BACKEND IMPLEMENTATION GUIDE

This document turns the high‑level backend plan in `Backend.md` into a concrete implementation guide, aligned with:
- Supabase (via **CLI + Docker**)
- Stripe (via **Stripe CLI**)
- Expo builds via **EAS**
- Frontend contracts (hooks/endpoints) for the Echo mobile app

> IMPORTANT: Photos are only visible for **up to 3 minutes** server‑side. The UI viewer can still show 30s, but backend access is cut off at 3min.

---

## 1. Stack & Environments

**Core stack**
- Database & Auth: **Supabase** (Postgres + PostGIS, Auth, Storage, RLS)
- Business logic: **Supabase Edge Functions** (Deno/TypeScript)
- Payments: **Stripe** (PaymentIntents)
- File storage: Supabase Storage bucket `echo-temp`
- Scheduling: `pg_cron` for cleanup of expired photos

**Secrets & config (conceptual)**
- Supabase
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe
  - `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Expo/EAS (public runtime env)
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 2. Local Setup (Dev Environment)

### 2.1 Supabase CLI + Docker

1. Instalar Supabase CLI (global ou binário).
2. Na raiz do repo (`ECHO/`):
   - `supabase init` → cria pasta `supabase/` (config, migrations).
3. Arrancar stack local:
   - `supabase start` → levanta Postgres + Auth + Storage + Studio em Docker.
4. Guardar as chaves geradas em `.env` (não commitar):
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### 2.2 Stripe CLI

1. Instalar Stripe CLI.
2. `stripe login` → associa à conta Stripe (modo teste).
3. Guardar em `.env`:
   - `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PUBLISHABLE_KEY`.
4. Para testar webhooks (mais tarde):
   - `stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook`.

### 2.3 Integração com Expo / EAS

- No EAS, definir envs de build:
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Chaves secretas (Stripe secret, webhook, service role) **nunca** vão para a app – ficam apenas em Supabase / servidor.

---

## 3. Database Schema & Rules

### 3.1 Tabelas Principais

**`profiles`** (extensão de `auth.users`)
- `id` uuid (PK, = `auth.users.id`)
- `balance` numeric default 0
- `reputation` int
- `is_agent` boolean
- `role` text (`'user' | 'admin'`)
- `created_at`, `updated_at` timestamptz

**`requests`** (jobs)
- `id` uuid PK
- `requester_id` uuid FK → `profiles.id`
- `location` geography(Point, 4326)  // lat/lng
- `title` text
- `description` text
- `price` numeric default 0.50
- `status` enum: `'open' | 'locked' | 'fulfilled' | 'expired' | 'disputed'`
- `stripe_payment_intent_id` text
- `created_at` timestamptz
- `expires_at` timestamptz (opcional)

**`photos`** (conteúdo efémero)
- `id` uuid PK
- `request_id` uuid FK → `requests.id`
- `agent_id` uuid FK → `profiles.id`
- `storage_path` text (chave no bucket `echo-temp`)
- `first_viewed_at` timestamptz
- `expires_at` timestamptz  // **sempre = first_viewed_at + 3 minutos**
- `is_reported` boolean default false

**`disputes`**
- `id` uuid PK
- `request_id` uuid FK
- `photo_id` uuid FK
- `requester_id` uuid FK
- `reason` text
- `status` enum: `'pending' | 'resolved_agent_paid' | 'resolved_refund'`
- `admin_notes` text
- `created_at`, `resolved_at` timestamptz

**`ledger_entries`** (saldo do agente)
- `id` uuid PK
- `profile_id` uuid FK → `profiles.id`
- `type` text (`'credit' | 'debit'`)
- `amount` numeric
- `source` text (`'job_payout' | 'payout_stripe' | 'adjustment'`)
- `meta` jsonb
- `created_at` timestamptz

### 3.2 RLS (resumo)

- `profiles`
  - SELECT: perfis públicos (ou restrito, a decidir).
  - UPDATE: apenas `auth.uid() = id`.
- `requests`
  - SELECT: público (para ver jobs no mapa).
  - INSERT: apenas utilizadores autenticados.
  - UPDATE: requester pode cancelar; sistema altera `status`.
- `photos`
  - INSERT: apenas via função que verifica distância < 10m (PostGIS) e estado do pedido.
  - SELECT: apenas `requester_id` do pedido ligado **e** `now() < expires_at`.
- `disputes`
  - INSERT: requester do pedido.
  - SELECT: requester, agente, admins.
  - UPDATE: apenas admins.

---

## 4. Edge Functions (API de Backend)

Todas as funções correm em Supabase Edge (Deno/TypeScript) e expõem endpoints REST usados pelo app.

### 4.1 `create-order`

- **URL**: `/functions/v1/create-order`
- **Método**: `POST` (auth obrigatória)
- **Input (frontend)**:
  - `location`: `{ latitude, longitude }`
  - `title`, `description`
  - `price` (normalmente 0.50)
- **Lado servidor**:
  1. Criar `PaymentIntent` em Stripe (valor, moeda `eur`).
  2. Inserir linha em `requests` com `status = 'locked'` e guardar `stripe_payment_intent_id`.
  3. Devolver `{ request_id, client_secret }` para o app concluir o pagamento.

### 4.2 `stripe-webhook`

- **URL**: `/functions/v1/stripe-webhook`
- **Método**: `POST` (validar assinatura com `STRIPE_WEBHOOK_SECRET`)
- **Eventos**:
  - `payment_intent.succeeded` → `requests.status = 'open'`.
  - `payment_intent.payment_failed` → `requests.status = 'expired'`.

### 4.3 `submit-photo`

- **URL**: `/functions/v1/submit-photo`
- **Método**: `POST` (auth agente)
- **Input**:
  - `request_id`, `storage_path`, `agent_lat`, `agent_lng`.
- **Servidor**:
  1. Verificar que o request está `'open'`.
  2. Usar PostGIS para verificar distância < 10m entre `agent` e `request.location`.
  3. Inserir em `photos`.
  4. Actualizar `requests.status = 'fulfilled'`.
  5. Criar `ledger_entries` e `profiles.balance += 0.40`.

### 4.4 `create-view-session`

- **URL**: `/functions/v1/create-view-session`
- **Método**: `POST` (auth requester)
- **Input**: `{ request_id }`.
- **Servidor**:
  1. Verificar que `auth.uid()` é `requester_id`.
  2. Obter foto ligada ao pedido.
  3. Se `first_viewed_at` for `NULL`, setar `first_viewed_at = now()` e `expires_at = now() + interval '3 minutes'`.
  4. Gerar signed URL de Storage com expiração curta (por ex. 3m + buffer).
  5. Devolver `{ photo_url, expires_at }`.

### 4.5 `report-photo`

- **URL**: `/functions/v1/report-photo`
- **Método**: `POST` (auth requester)
- **Input**: `{ request_id, reason }`.
- **Servidor**:
  - Criar linha em `disputes` (`status = 'pending'`) e marcar `photos.is_reported = true`.

### 4.6 `cleanup-cron`

- Função/SQL corrida via `pg_cron` a cada minuto:
  - Seleccionar `photos` com `expires_at < now()`.
  - Apagar ficheiros do bucket `echo-temp`.
  - Remover linhas de `photos`.

---

## 5. Frontend Integration Hooks (Contratos)

Estes são os "contratos" que o frontend vai usar – quando fores implementar hooks React, eles chamam estes endpoints.

- `useCreateEchoRequest()` → chama `create-order` e depois Stripe no app.
- `useSubmitJobPhoto()` → faz upload para Storage + chama `submit-photo`.
- `useEchoViewerSession(requestId)` → chama `create-view-session`, devolve `photoUrl` + `expiresAt` (app gere o contador de 30s de UI dentro do limite de 3 minutos de backend).
- `useReportPhoto()` → chama `report-photo`.
- `useNearbyRequests(lat, lng)` → query directa Supabase (view/RPC) para substituir `REQUESTS` mock no `RadarScreen`.

Com isto, o frontend pode ser ligado ao backend de forma previsível assim que as migrações e edge functions forem criadas.
