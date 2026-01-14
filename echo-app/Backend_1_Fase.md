# Echo App — Supabase (CLI + Docker) + Expo (Frontend) Integration Playbook

> Goal: Get the Echo MVP working **multi-user** (jobs → accept → photo → creator sees it) with a **robust Supabase backend** (RLS + Storage policies + RPC to avoid race conditions) and a **frontend that is clean + stable** (hooks verified, state predictable, no ghost updates).

---

## Phase 1 — Frontend Audit (First, before touching backend)

This phase is **already completed** for the current Echo codebase. The goal was to ensure
the frontend is stable and predictable before wiring it to Supabase.

### 1.1 Hooks correctness (React / React Native)

- Hooks are only used at the **top level** of components and custom hooks.
  - No occurrences of `if (x) useEffect(...)` or hooks inside conditions/loops were found.
- Dependency arrays are appropriate on the key screens:
  - `RadarScreen`, `CameraJobScreen`, `PhotoViewerScreen`, `ActivityScreen`,
    `CreateRequestSheet`, `OnboardingScreen`, `admin` screens.
- Subscriptions and listeners always clean up:
  - `Location.watchPositionAsync` (distance tracking in camera/radar flows).
  - `Keyboard.addListener` (keyboard offsets and sheet animations).
  - Custom store subscribers in `src/store/jobStore.js` (all `subscribe` calls return `unsubscribe`).
- No evidence of stale closures causing ghost updates in the currently implemented flows.

### 1.2 State management & data sources

- Global contexts:
  - `PhotoTimerContext` – manages per-job timers (default **180s / 3 minutos**),
    clean usage of `useState` e sem efeitos colaterais.
  - `ToastContext` – fornece `showToast` com `useCallback`, sem leaks.
- In-memory store (`src/store/jobStore.js`):
  - Mantém `testJobs` e `takenPhotos` **apenas na sessão actual**.
  - Padrão de pub/sub simples com `subscribe` + `notifyListeners`.
  - Usado por `RadarScreen`, `ActivityScreen`, `CameraJobScreen`, `admin/PhotoReviewer`.
- Hooks customizados:
  - `useKeyboardFooterOffset` – regista listeners de teclado e faz sempre `remove()` no cleanup.

### 1.3 Mock data & simulated backend

- Mock constants (`src/constants/mockData.js`):
  - `REQUESTS` – pedidos globais para o mapa (RadarScreen).
  - `MY_REQUESTS`, `MY_JOBS` – usados em Activity como histórico simulado.
- In-memory job store (`src/store/jobStore.js`):
  - Simula jobs/test jobs, fotos tiradas e sample data (`initializeSampleData`).
- Admin helpers (`src/utils/adminHelpers.js`):
  - `getMockStats`, `getMockDisputes`, `getMockUsers`, `getMockPhotosForReview`, `getMockAnalytics` –
    toda a área de admin está baseada em mocks.
- AsyncStorage:
  - Usado em `SplashScreen` e `OnboardingScreen` apenas para a flag `hasLaunched` (primeira vez).
  - Ainda **não** existe login/autenticação real ligada a Supabase Auth.

### 1.4 Screens/components que vão integrar com Supabase

Estes são os principais pontos de integração quando ligarmos o backend (Phase 3):

- **RadarScreen**
  - Ler pedidos abertos perto do utilizador (`useNearbyRequests(lat, lng)`).
  - Deixar de usar `REQUESTS`, `DEBUG_DUMMY_JOBS`, `generateNearbyRequests`.
  - Mostrar pedidos criados pelo próprio utilizador.
- **CreateRequestSheet + ExpandedMapModal**
  - Criar novos pedidos no backend (Edge Function `create-order`).
- **JobOfferSheet + CameraJobScreen**
  - Reservar/aceitar pedidos reais (actualizar `requests.status` em Supabase).
  - Submeter fotos (upload para Storage + Edge Function `submit-photo`).
- **PhotoViewerScreen + ViewTimer + PhotoTimerContext**
  - Obter signed URL e `expires_at` do backend (`create-view-session`).
  - Respeitar a regra dos **3 minutos** em coordenação com o backend.
- **ActivityScreen**
  - Substituir `MY_REQUESTS`, `MY_JOBS` e `jobStore` por queries reais a `requests` e `photos`.
- **ProfileScreen**
  - Ligar a `profiles` (balance, reputation, is_agent).
- **Admin screens**
  - Substituir todos os `getMock*` helpers por queries/views/RPC de Supabase.

### 1.5 Checklist de mudanças de frontend antes do backend

- [x] Hooks revistos nos ecrãs principais (sem hooks condicionais).
- [x] Subscrições/listeners com cleanup (Location, Keyboard, store listeners).
- [x] Identificados todos os locais com mock data (`mockData`, `jobStore`, `adminHelpers`).
- [x] Identificados os componentes que vao falar com Supabase (Radar, CreateRequestSheet,
      JobOfferSheet, CameraJobScreen, PhotoViewerScreen, Activity, Profile, Admin).

> Resultado: o frontend esta estavel e pronto para receber integracao com Supabase.

---

## Phase 2 — Supabase Local Setup (CLI + Docker) — Robust Foundation

Nesta fase vamos **usar o Supabase CLI** (a partir da raiz do repo) para criar
um projecto local, arrancar a stack Docker (Postgres + Auth + Storage + Studio)
e preparar o schema inicial descrito em `Backend-Implementation.md`.

### 2.1 Estrutura criada

A pasta `supabase/` foi criada com a seguinte estrutura:

```
echo-app/supabase/
├── config.toml                    # Configuração do Supabase local
├── seed.sql                       # Dados de teste (templates)
└── migrations/
    ├── 00001_enable_extensions.sql   # PostGIS, uuid-ossp, pg_trgm
    ├── 00002_profiles.sql            # Tabela profiles + triggers
    ├── 00003_requests.sql            # Tabela requests (jobs)
    ├── 00004_photos.sql              # Tabela photos
    ├── 00005_disputes.sql            # Tabela disputes
    ├── 00006_ledger.sql              # Tabela ledger_entries
    ├── 00007_rls_policies.sql        # Row Level Security
    ├── 00008_helper_functions.sql    # 10m validation, 3min session, lock
    ├── 00009_nearby_requests.sql     # Queries espaciais
    └── 00010_submit_photo.sql        # Submit + payment flow
```

### 2.2 Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfis de utilizadores (balance, reputation, is_agent, Stripe IDs) |
| `requests` | Pedidos de fotos com localização PostGIS, preço, status |
| `photos` | Fotos submetidas com validação de localização e sessão de 3 min |
| `disputes` | Disputas quando criador reporta foto |
| `ledger_entries` | Histórico imutável de transacções (audit trail) |

### 2.3 Funções principais (RPC)

| Função | Descrição |
|--------|-----------|
| `create_request(...)` | Cria pedido com geografia PostGIS |
| `get_nearby_requests(lat, lng, radius)` | Pedidos abertos num raio (default 5km) |
| `get_my_requests()` | Pedidos criados pelo user |
| `get_my_jobs()` | Jobs aceites pelo agent |
| `lock_request(request_id)` | Aceitar job (atómico, evita race conditions) |
| `submit_photo(...)` | Submeter foto + validar 10m + processar pagamento |
| `start_view_session(photo_id)` | Iniciar sessão de 3 minutos |
| `check_view_session(photo_id)` | Verificar se sessão ainda é válida |
| `validate_photo_location(photo_id)` | Validar distância (≤10m) |
| `add_ledger_entry(...)` | Adicionar entrada ao ledger (atómico) |
| `approve_photo(photo_id)` | Criador aprova foto |

### 2.4 Regras de negócio implementadas

- **10 metros**: `submit_photo` e `validate_photo_location` calculam distância
  com `ST_Distance()` e comparam com `validation_radius_meters` (default 10m).
- **3 minutos**: `start_view_session` define `view_session_expires_at = NOW() + 3 min`.
  `check_view_session` verifica se ainda é válido.
- **Race conditions**: `lock_request` usa `UPDATE ... WHERE status = 'open' AND agent_id IS NULL`
  para garantir que só um agente pode aceitar.
- **RLS**: Todas as tabelas têm Row Level Security activado com políticas específicas.

### 2.5 Como aplicar as migrations

**Opção A: Supabase Dashboard (projecto remoto)**

1. Ir a https://supabase.com/dashboard/project/dyywmbrxvypnpvuygqub/sql
2. Executar cada ficheiro `.sql` por ordem (00001 → 00010)
3. Verificar no Table Editor se as tabelas foram criadas

**Opção B: Supabase CLI (se instalado)**

```bash
cd echo-app
npx supabase link --project-ref dyywmbrxvypnpvuygqub
npx supabase db push
```

**Opção C: psql directo**

```bash
psql "postgresql://postgres:[PASSWORD]@db.dyywmbrxvypnpvuygqub.supabase.co:5432/postgres" \
  -f supabase/migrations/00001_enable_extensions.sql
# ... repetir para cada ficheiro
```

### 2.6 Status da instalação

**Data:** 2025-12-24

- ✅ Supabase CLI instalado (`node_modules\supabase\bin\supabase.exe` v2.70.4)
- ✅ Projecto ligado (`dyywmbrxvypnpvuygqub`)
- ✅ Todas as 10 migrations aplicadas com sucesso
- ✅ PostGIS habilitado (schema `public`, v3.3.7)
- ✅ Tabelas criadas: `profiles`, `requests`, `photos`, `disputes`, `ledger_entries`
- ✅ RLS policies aplicadas
- ✅ Funções RPC criadas

**Comando para verificar:**
```bash
.\node_modules\supabase\bin\supabase.exe inspect db table-sizes --linked
```

---

## Phase 3 — Frontend Integration ✅ CONCLUÍDA

### 3.1 O que foi criado

#### SDK Instalado
- [x] `@supabase/supabase-js@2.89.0` instalado via npm

#### Ficheiros criados

| Ficheiro | Descrição |
|----------|-----------|
| `src/lib/supabase.js` | Cliente Supabase configurado com AsyncStorage |
| `src/context/AuthContext.js` | Context + Provider para auth (login, signup, logout) |
| `src/hooks/useNearbyRequests.js` | Fetch pedidos perto do utilizador via RPC |
| `src/hooks/useProfile.js` | Fetch e update do perfil do utilizador |
| `src/hooks/useCreateRequest.js` | Criar novos pedidos de foto |
| `src/hooks/useLockRequest.js` | Aceitar/bloquear um pedido (job) |
| `src/hooks/useSubmitPhoto.js` | Upload foto + submissão via RPC |
| `src/hooks/useViewSession.js` | Sessão de visualização com timer de 3 min |
| `src/hooks/index.js` | Exporta todos os hooks |
| `.env.example` | Template de variáveis de ambiente |
| `supabase/migrations/00011_storage_bucket.sql` | Bucket + policies para fotos |

### 3.2 Checklist

1. [x] Obter anon key do Supabase Dashboard e criar `.env`
2. [ ] Criar utilizadores de teste no Supabase Auth
3. [ ] Testar funções RPC no SQL Editor
4. [x] Criar hooks React no frontend (`useNearbyRequests`, `useCreateRequest`, etc.)
5. [x] Criar Storage bucket `echo-photos` (migration 011 aplicada)
6. [x] Integrar hooks no RadarScreen (com fallback para mock data)
7. [ ] Testar fluxo completo: criar pedido → aceitar → tirar foto → ver foto

### 3.3 Integração no RadarScreen

O `RadarScreen.js` foi actualizado:
- Import do `useNearbyRequests` hook
- Hook configurado para buscar pedidos num raio de 5km
- Estado `useSupabaseData` para toggle entre dados reais e mock
- UseEffect para sincronizar dados do Supabase quando disponíveis

**Nota:** Por defeito, a app continua a usar mock data. Para activar dados do Supabase:
1. Criar utilizador de teste no Auth
2. Criar alguns pedidos de teste na tabela `requests`
3. O hook vai buscar automaticamente

### 3.4 Próximos passos (Phase 4) ✅ CONCLUÍDA

1. [x] Criar ecrã de Login/Signup → `AuthScreen.js`
2. [x] Wrap da app com AuthProvider → `App.js`
3. [x] Testar fluxo completo end-to-end
4. [x] Integrar hooks nos outros ecrãs (Activity, Profile, etc.)

---

## Phase 4 — Full Integration Across Screens ✅ CONCLUÍDA

**Data:** 2025-12-24

### 4.1 O que foi implementado

| Ecrã | Integração | Hook(s) Usado(s) |
|------|------------|------------------|
| `AuthScreen.js` | Login/Signup com Supabase Auth | `useAuth` (signIn, signUp) |
| `App.js` | AuthProvider a envolver toda a app | `AuthProvider` |
| `CreateRequestSheet` | Criar pedidos reais no Supabase | `useCreateRequest` |
| `RadarScreen` | Aceitar jobs atomicamente | `useLockRequest` |
| `CameraJobScreen` | Upload de fotos para Supabase Storage | `useSubmitPhoto` |
| `PhotoViewerScreen` | Sessões de 3 minutos do backend | `useViewSession` |
| `ProfileScreen` | Dados reais do perfil | `useProfile` |
| `ActivityScreen` | My Requests + My Jobs | `useMyActivity` |

### 4.2 Hook useMyActivity (novo)

Ficheiro: `src/hooks/useMyActivity.js`

```javascript
export const useMyActivity = () => {
    // Fetch:
    // - My Requests: Pedidos criados pelo utilizador
    // - My Jobs: Jobs completados como agente
    return { myRequests, myJobs, loading, error, refetch };
};
```

### 4.3 Fluxo End-to-End

1. **Utilizador faz login** → `AuthScreen` → `signIn()` → sessão guardada em AsyncStorage
2. **Cria pedido** → `CreateRequestSheet` → `useCreateRequest()` → RPC `create_request`
3. **Agente vê pedidos** → `RadarScreen` → `useNearbyRequests()` → RPC `get_nearby_requests`
4. **Agente aceita job** → `RadarScreen` → `useLockRequest()` → RPC `lock_request`
5. **Agente tira foto** → `CameraJobScreen` → `useSubmitPhoto()` → Storage + RPC `submit_photo`
6. **Criador vê foto** → `PhotoViewerScreen` → `useViewSession()` → RPC `start_view_session`

### 4.4 Fallback para Mock Data

Todos os ecrãs mantêm fallback para mock data quando:
- Utilizador não está autenticado
- Erro de rede/Supabase
- Desenvolvimento local sem backend

---

## Phase 5 — Admin Integration with Supabase

### 5.1 Objetivo

Integrar os ecrãs de administração com dados reais do Supabase, substituindo todos os `getMock*` helpers.

### 5.2 Ecrãs a integrar

| Ecrã | Mock Atual | Integração Pretendida |
|------|------------|----------------------|
| `AdminDashboard.js` | `getMockDisputes()` | Query `disputes` com contagens |
| `DisputesList.js` | `getMockDisputes()` | Query `disputes` + `photos` |
| `DisputeReview.js` | Mock data via props | Query completa do dispute |
| `ManageUsers.js` | `getMockUsers()` | Query `profiles` |
| `PhotoReviewer.js` | `jobStore` (getPendingPhotos) | Query `photos` pendentes |
| `Analytics.js` | `getMockAnalytics()` | Aggregations e stats |

### 5.3 Hooks a criar

```javascript
// src/hooks/useAdminStats.js
export const useAdminStats = () => {
    // Returns: { pending, disputes, users, jobs, earnings, photos }
};

// src/hooks/useAdminDisputes.js
export const useAdminDisputes = () => {
    // Returns: { disputes, loading, refetch, resolveDispute }
};

// src/hooks/useAdminUsers.js
export const useAdminUsers = (searchQuery) => {
    // Returns: { users, loading, refetch, updateUser, banUser }
};

// src/hooks/useAdminPhotos.js
export const useAdminPhotos = () => {
    // Returns: { pendingPhotos, loading, approvePhoto, rejectPhoto }
};
```

### 5.4 Verificação de role admin

Actualizar `ProfileScreen.js` para usar role do backend:

```javascript
// Antes (mock)
const MOCK_USER = { isAdmin: true };

// Depois (Supabase)
const { profile } = useAuth();
const canReviewPhotos = profile?.role === 'reviewer' || profile?.role === 'admin';
```

### 5.5 Checklist

1. [x] Adicionar coluna `role` à tabela `profiles` (migration 00012_admin_role.sql)
2. [x] Criar hooks admin (`useAdminStats`, `useAdminDisputes`, `useAdminUsers`, `useAdminPhotos`)
3. [x] Actualizar `AdminDashboard.js` - usa `useAdminStats` e `useAdminDisputes`
4. [x] Actualizar `DisputesList.js` - usa `useAdminDisputes` com RefreshControl
5. [x] Actualizar `ManageUsers.js` - usa `useAdminUsers` com RefreshControl
6. [x] Actualizar `PhotoReviewer.js` - usa `useAdminPhotos` com merge de dados locais
7. [x] Actualizar `ProfileScreen.js` - role check via `profile?.role`
8. [x] Migração aplicada ao Supabase remoto

### 5.6 Resumo da Implementação

**Migration 00012_admin_role.sql:**
- Coluna `role` em `profiles` (user, agent, reviewer, admin)
- RPC `get_admin_stats()` - estatísticas do dashboard
- RPC `get_admin_disputes(status)` - lista de disputas com filtro
- RPC `get_admin_users(search)` - lista de utilizadores com pesquisa
- RPC `resolve_dispute(id, resolution, refund)` - resolver disputa

**Hooks criados:**
- `useAdminStats` - estatísticas para dashboard
- `useAdminDisputes` - disputas com `resolveDispute()`
- `useAdminUsers` - utilizadores com `updateUserRole()`
- `useAdminPhotos` - fotos pendentes com `approvePhoto()` e `rejectPhoto()`

**Padrão de fallback:**
Todos os ecrãs admin mantêm fallback para mock data quando:
- Utilizador não tem role admin/reviewer
- Erro de rede/Supabase
- Dados ainda não carregados

---

## Phase 5B — Analytics & Dispute Review Integration ✅ CONCLUÍDA

**Data:** 2025-12-24

### 5B.1 O que foi implementado

| Ficheiro | Descrição |
|----------|-----------|
| `00013_admin_analytics.sql` | RPC `get_admin_analytics(period)` e `get_top_photographers(limit)` |
| `useAdminAnalytics.js` | Hook para buscar analytics com filtro de período |
| `Analytics.js` | Integrado com Supabase, RefreshControl, Quick Stats dinâmicos |
| `DisputeReview.js` | Integrado com `useAdminDisputes.resolveDispute()` |

### 5B.2 Funcionalidades

- **Analytics por período**: Today, This Week, This Month, All Time
- **Dados calculados**:
  - Revenue (platform fees de pedidos completed)
  - Jobs (created, completed, disputed, expired)
  - Users (new, active, banned)
  - Quick Stats (success rate, avg completion time, avg rating)
  - Top Photographers (por earnings)
- **Resolve Dispute**: Approve (photographer paid) ou Reject (refund + strike)
- **Loading states** e **disabled buttons** durante operações

---

## Phase 5C — ActivityScreen Tab Logic Documentation ✅

**Data:** 2025-12-26

> ⚠️ **CRITICAL: DO NOT CHANGE THIS LOGIC** — The current implementation is correct for production multi-user scenarios. This documentation ensures future developers understand the intended behavior.

### 5C.1 Tab Definitions

#### **Requested Tab** (Photos I Requested from Others)

Shows ALL requests where the **current user is the creator/requester**.

| Status | Display | Actions |
|--------|---------|---------|
| `open` | "WAITING FOR PHOTO" (yellow) | Waiting for agent to accept |
| `locked` | "WAITING FOR PHOTO" (yellow) | Agent accepted, taking photo |
| `fulfilled` | "PHOTO DELIVERED" (cyan) | VIEW PHOTO button + 3-min timer |
| `disputed` | "UNDER REVIEW" (red) | Admin reviewing reported photo |
| (expired) | "PHOTO EXPIRED" (red) | Timer expired, no view button |

**Key Features:**
- Shows thumbnail ONLY while 3-minute timer is active
- VIEW PHOTO button appears for fulfilled requests with photos
- Timer starts when user first views the photo
- After timer expires: thumbnail hidden, VIEW PHOTO button removed
- Disputed photos show "UNDER REVIEW" status

#### **Completed Tab** (Jobs I Did for Others)

Shows ONLY jobs where the **current user was the agent/photographer**.

| Status | Display | Privacy |
|--------|---------|---------|
| `locked` | "Awaiting Payment" (blue) | NO thumbnail |
| `fulfilled` | "Payment Received" (cyan) | NO thumbnail |
| `disputed` | "Under Review" (red) | NO thumbnail |

**Key Features:**
- **NEVER shows thumbnails** (privacy protection for requesters)
- Shows payment status based on request status
- Displays earnings/pending amounts
- Only shows service name/description

### 5C.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      ActivityScreen                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  useMyActivity() Hook                                       │
│  ├── myRequests: requests WHERE creator_id = current_user   │
│  └── myJobs: photos WHERE agent_id = current_user           │
│                                                             │
├───────────────────────┬─────────────────────────────────────┤
│   REQUESTED TAB       │     COMPLETED TAB                   │
│   (mergedRequests)    │     (mergedJobs)                    │
├───────────────────────┼─────────────────────────────────────┤
│ • Filter: all except  │ • Filter: photos where user was    │
│   'cancelled'         │   the agent (photographer)         │
│ • Source: myRequests  │ • Source: myJobs                   │
│ • Shows thumbnails    │ • NO thumbnails (privacy)          │
│ • VIEW PHOTO button   │ • Shows payment status             │
│ • 3-minute timer      │ • Shows earnings                   │
└───────────────────────┴─────────────────────────────────────┘
```

### 5C.3 Single-User Testing vs Multi-User Production

#### Testing Scenario (Current)
- **One user acts as both requester AND agent**
- Same photo appears in BOTH tabs:
  - **Requested Tab**: As a photo delivered to my request (can view with timer)
  - **Completed Tab**: As a job I completed (shows payment status, no thumbnail)
- This is CORRECT behavior — both relationships exist

#### Production Scenario (Target)
- **Different users for requester and agent**
- Photo appears in ONE tab per user:
  - **Requester sees**: Requested tab only (VIEW PHOTO + timer)
  - **Agent sees**: Completed tab only (payment status, no thumbnail)

### 5C.4 Timer & Expiration Logic

```javascript
// Timer ID is the request ID (Supabase) or originalId (local)
const timerId = item.isSupabase ? item.supabaseId : item.originalId;

// Check expiration via PhotoTimerContext (persisted) + local session state
const isTimerExpired = isJobExpired(timerId);

// Photo display rules:
if (hasPhoto && !isTimerExpired) {
    // Show thumbnail
    // Show VIEW PHOTO button
    // Show active timer
} else if (hasPhoto && isTimerExpired) {
    // Hide thumbnail (show icon instead)
    // Hide VIEW PHOTO button
    // Show "PHOTO EXPIRED" status
}
```

### 5C.5 Code Location Reference

| File | Function | Purpose |
|------|----------|---------|
| `ActivityScreen.js` | `mergedRequests` (L94-107) | Filter for Requested tab |
| `ActivityScreen.js` | `mergedJobs` (L109-121) | Filter for Completed tab |
| `ActivityScreen.js` | `renderRequestItem` (L123-258) | Render Requested items |
| `ActivityScreen.js` | `renderJobItem` (L286+) | Render Completed items |
| `useMyActivity.js` | `fetchActivity` | Supabase queries for both tabs |

### 5C.6 Common Mistakes to Avoid

❌ **DO NOT** put fulfilled requests in the Completed tab
- Fulfilled requests = photos delivered TO the user's request
- These should stay in Requested tab with VIEW PHOTO functionality

❌ **DO NOT** show thumbnails in Completed tab
- Agent should not keep copies of photos taken for others
- Privacy protection for requesters

❌ **DO NOT** remove the "same photo in both tabs" behavior
- In single-user testing, this is correct
- In production, different users mean different tabs

✅ **DO** maintain the 3-minute timer logic for Requested tab
✅ **DO** keep privacy protection in Completed tab (no thumbnails)
✅ **DO** use `creator_id` for Requested, `agent_id` for Completed

---

## Phase 5D — Timer Synchronization Fix ✅ CONCLUÍDA

**Data:** 2025-12-26

### 5D.1 Problema Identificado

Quando um admin aprovava uma foto (após disputa ou directamente), os timers entre o ActivityScreen e o PhotoViewerScreen não estavam sincronizados:
- O backend definia `view_session_started_at = NULL` (sessão reset)
- Mas o cache local (PhotoTimerContext) ainda tinha o timer antigo/expirado
- Resultado: ActivityScreen mostrava timer expirado enquanto PhotoViewerScreen mostrava timer fresco

### 5D.2 Solução Implementada

#### Backend (SQL Functions)

| Função | Alteração |
|--------|-----------|
| `admin_approve_photo(photo_id)` | Define `view_session_started_at = NULL` e `view_session_expires_at = NULL` para reset da sessão |
| `resolve_dispute(dispute_id, resolution, reject)` | Quando aprova (reject=false), reset da sessão igual ao `admin_approve_photo` |
| `start_view_session(photo_id)` | Inicia nova sessão de 3 min quando `view_session_started_at IS NULL` |

#### Frontend (Hooks & Components)

| Ficheiro | Alteração |
|----------|-----------|
| `useMyActivity.js` | Agora busca `view_session_started_at` e `view_session_expires_at` do backend |
| `ActivityScreen.js` | Sincroniza cache local com backend; limpa timer quando backend tem NULL |
| `PhotoTimerContext.js` | `startTimer()` aceita parâmetro `forceReset` para garantir timer fresco |
| `PhotoViewerScreen.js` | Usa `forceReset=true` ao iniciar sessão para garantir sincronização |
| `ViewTimer.js` | Mostra "3:00" quando sessão não iniciada (muted styling) |

### 5D.3 Fluxo Corrigido

```
1. Admin aprova foto
   └── Backend: view_session_started_at = NULL, view_session_expires_at = NULL

2. Creator abre ActivityScreen
   └── useMyActivity() busca dados do backend
   └── ActivityScreen detecta NULL no backend mas timer local existe
   └── Limpa cache local via clearTimer()
   └── ViewTimer mostra "3:00" (não iniciado, cinza)

3. Creator clica VIEW PHOTO
   └── PhotoViewerScreen chama start_view_session()
   └── Backend inicia sessão: expires_at = NOW() + 3 min
   └── startTimer(photoId, seconds, forceReset=true) actualiza cache local

4. Ambos os timers sincronizados
   └── ActivityScreen: timer a contar
   └── PhotoViewerScreen: timer idêntico
```

### 5D.4 SQL Deployment Script

O ficheiro `supabase/DEPLOY_SCRIPT.sql` foi actualizado com todas as funções corrigidas:
- `get_admin_disputes(status)`
- `admin_reject_photo(photo_id, reason)`
- `admin_approve_photo(photo_id)` — **com reset de sessão**
- `resolve_dispute(dispute_id, resolution, reject)` — **com reset de sessão**
- `start_view_session(photo_id)` — **inicia nova sessão quando NULL**

### 5D.5 Testes Recomendados

1. **Fluxo de aprovação directa:**
   - Admin aprova foto no PhotoReviewer
   - Creator abre ActivityScreen → timer deve mostrar "3:00"
   - Creator clica VIEW PHOTO → timer começa a contar

2. **Fluxo de disputa aprovada:**
   - Creator reporta foto (disputa criada)
   - Admin resolve disputa a favor do agent (approved)
   - Creator abre ActivityScreen → timer deve mostrar "3:00"
   - Creator clica VIEW PHOTO → timer começa a contar

3. **Sincronização:**
   - Abrir foto, ver timer a contar
   - Voltar ao ActivityScreen → timer deve estar igual
   - Continuar a contar sincronizado

---

## Phase 6 — Testing & Polish (Próxima Fase)

### 6.1 Objetivo

Testar todos os fluxos end-to-end e corrigir bugs encontrados.

### 6.2 Checklist

1. [ ] Criar utilizador de teste com role 'admin' no Supabase
2. [x] Testar fluxo completo: criar pedido → aceitar → tirar foto → ver foto
3. [x] Testar fluxo admin: ver disputas → resolver → verificar ledger
4. [ ] Testar validação de 10 metros (PostGIS)
5. [x] Testar expiração de 3 minutos (view session)
6. [ ] Verificar RLS policies em todos os cenários
7. [ ] Testar em dispositivo físico (Android/iOS)
8. [x] Testar sincronização de timers após admin aprovar foto

### 6.3 Role Separation (Pre-Production Requirement)

> ⚠️ **IMPORTANT**: Currently disabled for testing. Must be implemented before production deployment.

In testing, the same user can act as both **creator** (requester) and **agent** (photographer) for the same request. This allows testing the full flow with a single account. However, in production this creates a conflict of interest and must be prevented.

#### Implementation Required:

1. **Backend Validation (`lock_request` function)**
   ```sql
   -- Add check to prevent self-accept
   IF v_request.creator_id = auth.uid() THEN
       RETURN jsonb_build_object('success', false, 'error', 'Cannot accept your own request');
   END IF;
   ```

2. **Frontend Filtering (`useNearbyRequests.js`)**
   ```javascript
   // Filter out own requests from available jobs
   const availableJobs = requests.filter(r => !r.is_own);
   ```
   Note: The `is_own` flag is already returned by `get_nearby_requests()` RPC.

3. **UI Indicators (RadarScreen)**
   - Different marker colors for "my requests" vs "available jobs"
   - "My Request" badge/label on own requests
   - Disable "Accept" button for own requests (with explanatory message)

#### Current State (Testing Mode):
- `lock_request`: No `creator_id` check (allows self-accept)
- `get_nearby_requests`: Returns `is_own` flag but doesn't filter
- UI: Own requests shown with same styling as available jobs

#### Production State (Required):
- `lock_request`: Rejects if `creator_id = auth.uid()`
- `useNearbyRequests`: Filters `is_own = true` from job list
- UI: Clear distinction between own requests and available jobs

#### Business Logic for Rejected Photos:
When a photo is rejected (by admin or via dispute resolution):
- **Photographer A** sees rejection feedback for their own photo
- **Photographer B** (new agent) does NOT see Photographer A's rejection feedback
- Each photographer only sees feedback for their own submissions
- This is already correctly implemented via `photos.agent_id` filtering
