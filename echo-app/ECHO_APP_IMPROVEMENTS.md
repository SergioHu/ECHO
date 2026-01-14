# ECHO APP - Melhorias Significativas

## Documento de Especificação Técnica e Funcional

**Versão:** 2.0  
**Data:** Dezembro 2024  
**Status:** Para Implementação

---

## 📋 Índice

1. [Onboarding & Primeira Experiência](#1-onboarding--primeira-experiência)
2. [Admin Dashboard](#2-admin-dashboard)
3. [Especificações Técnicas](#3-especificações-técnicas)
4. [Fluxos de Teste](#4-fluxos-de-teste)

---

## 1. Onboarding & Primeira Experiência

### 1.1 Ecrã de Loading Inicial

Quando a app abre pela primeira vez, o utilizador deve ver um ecrã de loading premium.

#### Elementos Visuais:
```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│              ╔═══════╗                 │
│              ║ ECHO  ║                 │
│              ╚═══════╝                 │
│                                        │
│         "Connecting you to            │
│          the world around"            │
│                                        │
│        ════════════════════           │
│        ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░           │
│              45%                       │
│                                        │
│        Loading your experience...      │
│                                        │
└────────────────────────────────────────┘
```

#### Especificações:
| Elemento | Descrição |
|----------|-----------|
| **Logo** | Logo ECHO animado (fade in + subtle pulse) |
| **Tagline** | "Connecting you to the world around" |
| **Progress Bar** | Barra cyan (#00E5FF) com animação suave |
| **Percentagem** | Texto dinâmico: 0% → 100% |
| **Loading Text** | Mensagens rotativas durante o loading |

#### Mensagens Rotativas de Loading:
```javascript
const loadingMessages = [
  "Loading your experience...",
  "Preparing the radar...",
  "Connecting to GPS...",
  "Almost ready...",
  "Let's go!"
];
```

#### Tempo de Loading:
- **Mínimo:** 2 segundos (para mostrar a marca)
- **Máximo:** 5 segundos (timeout com retry)

---

### 1.2 Tutorial de Onboarding (Primeira Vez)

Após o loading, utilizadores novos veem um tutorial interactivo.

#### Slide 1: Bem-vindo
```
┌────────────────────────────────────────┐
│                                        │
│         🎯                             │
│                                        │
│      Welcome to ECHO                   │
│                                        │
│   Earn money by taking photos         │
│   for people who need them.           │
│                                        │
│   It's simple, fast, and fun.         │
│                                        │
│                                        │
│         ○ ○ ○ ○ ○                      │
│                                        │
│        [ GET STARTED ]                 │
│                                        │
└────────────────────────────────────────┘
```

#### Slide 2: Como Funciona (Photographer)
```
┌────────────────────────────────────────┐
│                                        │
│         📸                             │
│                                        │
│      Take Photos, Earn Money          │
│                                        │
│   1. See photo requests on the map    │
│   2. Accept jobs within 10m           │
│   3. Point your camera at the target  │
│   4. Snap the photo & get paid!       │
│                                        │
│                                        │
│         ● ○ ○ ○ ○                      │
│                                        │
│        [ NEXT ]                        │
│                                        │
└────────────────────────────────────────┘
```

#### Slide 3: Como Funciona (Requester)
```
┌────────────────────────────────────────┐
│                                        │
│         🗺️                             │
│                                        │
│      Request Photos Anywhere          │
│                                        │
│   1. Drop a pin on the map            │
│   2. Set your price                   │
│   3. Wait for a photographer          │
│   4. Review and approve the photo     │
│                                        │
│                                        │
│         ○ ● ○ ○ ○                      │
│                                        │
│        [ NEXT ]                        │
│                                        │
└────────────────────────────────────────┘
```

#### Slide 4: Regras Importantes
```
┌────────────────────────────────────────┐
│                                        │
│         ⚠️                             │
│                                        │
│      Important Rules                   │
│                                        │
│   ✓ You must be within 10m to         │
│     accept and complete a job         │
│                                        │
│   ✓ Photos are reviewed within        │
│     30 seconds                         │
│                                        │
│   ✓ No screenshots allowed            │
│                                        │
│   ✓ Disputes are reviewed by admin    │
│                                        │
│         ○ ○ ● ○ ○                      │
│                                        │
│        [ NEXT ]                        │
│                                        │
└────────────────────────────────────────┘
```

#### Slide 5: Permissões
```
┌────────────────────────────────────────┐
│                                        │
│         📍                             │
│                                        │
│      We Need Some Permissions         │
│                                        │
│   📍 Location                          │
│      To show jobs near you            │
│                                        │
│   📷 Camera                            │
│      To take photos for jobs          │
│                                        │
│   🔔 Notifications                     │
│      To alert you of new jobs         │
│                                        │
│         ○ ○ ○ ● ○                      │
│                                        │
│     [ ALLOW PERMISSIONS ]              │
│                                        │
└────────────────────────────────────────┘
```

#### Slide 6: Pronto!
```
┌────────────────────────────────────────┐
│                                        │
│         🚀                             │
│                                        │
│      You're All Set!                   │
│                                        │
│   Start exploring the map and         │
│   find your first photo job.          │
│                                        │
│   Good luck and have fun!             │
│                                        │
│                                        │
│         ○ ○ ○ ○ ●                      │
│                                        │
│      [ START EXPLORING ]               │
│                                        │
└────────────────────────────────────────┘
```

---

### 1.3 Alertas e Avisos

#### Alerta de Primeira Vez no Mapa:
```javascript
{
  title: "Tap on a job marker to see details",
  description: "Green markers are within 10m - you can accept these!",
  type: "info",
  dismissable: true,
  showOnce: true
}
```

#### Alerta de Primeiro Job:
```javascript
{
  title: "Great! You accepted your first job!",
  description: "Point your camera at the target. The radar will guide you.",
  type: "success",
  dismissable: true,
  showOnce: true
}
```

#### Alertas de Erros:
| Erro | Mensagem |
|------|----------|
| GPS desligado | "Please enable location services to use ECHO" |
| Sem internet | "No internet connection. Please check your network." |
| Câmara negada | "Camera permission is required to take photos" |

---

## 2. Admin Dashboard

### 2.1 Acesso ao Admin

O Admin Dashboard é **apenas acessível** pelo administrador (hardcoded por user ID ou email).

#### Método de Acesso:
```javascript
// No ProfileScreen.js
const ADMIN_EMAILS = ['sergio@echo.app']; // Ou user IDs

const isAdmin = ADMIN_EMAILS.includes(currentUser.email);

// Mostrar botão Admin apenas se isAdmin
{isAdmin && (
  <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')}>
    <Text>Admin Dashboard</Text>
  </TouchableOpacity>
)}
```

#### Localização no UI:
- **Profile Screen** → Novo item no menu: "Admin Dashboard"
- Apenas visível para admins
- Ícone: 🛡️ ou ⚙️

---

### 2.2 Layout do Admin Dashboard

```
┌────────────────────────────────────────┐
│  ←  Admin Dashboard           🔄       │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ PENDING  │ │ DISPUTES │ │ USERS  │ │
│  │    5     │ │    2     │ │   127  │ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  JOBS    │ │ EARNINGS │ │ PHOTOS │ │
│  │   342    │ │ €1,247   │ │  891   │ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                        │
├────────────────────────────────────────┤
│  QUICK ACTIONS                         │
│                                        │
│  [ 📍 Create Test Job ]                │
│  [ 📸 View Test Photo ]                │
│  [ 👥 Manage Users ]                   │
│  [ 🚨 Review Disputes ]                │
│  [ 📊 View Analytics ]                 │
│                                        │
└────────────────────────────────────────┘
```

---

### 2.3 Funcionalidades do Admin

#### 2.3.1 Criar Job de Teste (Create Test Job)

Permite ao admin criar um job em qualquer localização do mapa.

```
┌────────────────────────────────────────┐
│  ←  Create Test Job                    │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  │         [MAP VIEW]             │   │
│  │                                │   │
│  │      Tap to place job 📍       │   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  Location: 38.7387, -9.2115           │
│                                        │
│  Price:                                │
│  [ €0.50 ] [ €1.00 ] [ €2.00 ]        │
│  [ Custom: €______ ]                   │
│                                        │
│  Description (optional):               │
│  ┌────────────────────────────────┐   │
│  │ Take photo of building entrance│   │
│  └────────────────────────────────┘   │
│                                        │
│        [ CREATE JOB ]                  │
│                                        │
└────────────────────────────────────────┘
```

#### Campos:
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Location | Tap no mapa | ✅ |
| Price | Seleção ou custom | ✅ |
| Description | Text input | ❌ |

---

#### 2.3.2 Ver Foto de Teste (View Test Photo)

Reutiliza o componente existente de visualização de foto (BMW) com protecção de screenshot.

```
┌────────────────────────────────────────┐
│  ←  Test Photo Viewer                  │
├────────────────────────────────────────┤
│                                        │
│  Select a photo to view:               │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ Job #101 - €0.50                │  │
│  │ Photo taken: 2 min ago          │  │
│  │ Status: Pending Review          │  │
│  │                         [ VIEW ]│  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ Job #99 - €1.20                 │  │
│  │ Photo taken: 15 min ago         │  │
│  │ Status: Disputed                │  │
│  │                         [ VIEW ]│  │
│  └─────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

#### Ao clicar VIEW:
```
┌────────────────────────────────────────┐
│  ←  Photo Review           ⏱️ 30s      │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  │                                │   │
│  │         [PHOTO]                │   │
│  │      (Screenshot blocked)      │   │
│  │                                │   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  Job #101 | €0.50                      │
│  Photographer: user_123               │
│  Location: 38.7387, -9.2115           │
│  Distance when taken: 8m              │
│                                        │
│  ┌─────────────┐  ┌─────────────┐     │
│  │  ✓ APPROVE  │  │  ✗ REJECT   │     │
│  └─────────────┘  └─────────────┘     │
│                                        │
└────────────────────────────────────────┘
```

---

#### 2.3.3 Gestão de Utilizadores (Manage Users)

```
┌────────────────────────────────────────┐
│  ←  Manage Users           🔍          │
├────────────────────────────────────────┤
│                                        │
│  Search: [________________]            │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ 👤 user_123                     │  │
│  │ Photos: 23 | Rating: 4.9        │  │
│  │ Strikes: 0 | Balance: €12.50    │  │
│  │ Status: ● Active                │  │
│  │                    [ DETAILS ]  │  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ 👤 user_456                     │  │
│  │ Photos: 5 | Rating: 3.2         │  │
│  │ Strikes: 2 | Balance: €1.20     │  │
│  │ Status: ⚠️ Warning              │  │
│  │                    [ DETAILS ]  │  │
│  └─────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

#### Detalhes do User:
```
┌────────────────────────────────────────┐
│  ←  User Details                       │
├────────────────────────────────────────┤
│                                        │
│  👤 user_456                           │
│                                        │
│  Email: user456@email.com              │
│  Joined: 15 Nov 2024                   │
│  Last Active: 2 hours ago              │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  Stats:                                │
│  • Photos Taken: 5                     │
│  • Jobs Requested: 12                  │
│  • Rating: 3.2 ⭐                      │
│  • Strikes: 2                          │
│  • Balance: €1.20                      │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  Actions:                              │
│  [ Add Strike ]  [ Remove Strike ]     │
│  [ Ban User ]    [ Reset Password ]    │
│                                        │
└────────────────────────────────────────┘
```

---

#### 2.3.4 Revisão de Disputas (Review Disputes)

A funcionalidade **mais importante** para o flow de teste.

```
┌────────────────────────────────────────┐
│  ←  Disputes              Filter ▼     │
├────────────────────────────────────────┤
│                                        │
│  Pending: 2 | Resolved: 45             │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ 🚨 DISPUTE #47                  │  │
│  │ Job #101 | €0.50                │  │
│  │ Requester: user_789             │  │
│  │ Photographer: user_123          │  │
│  │ Reason: "Wrong location"        │  │
│  │ Time: 5 min ago                 │  │
│  │                     [ REVIEW ]  │  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ 🚨 DISPUTE #46                  │  │
│  │ Job #98 | €1.00                 │  │
│  │ Requester: user_222             │  │
│  │ Photographer: user_333          │  │
│  │ Reason: "Photo is blurry"       │  │
│  │ Time: 1 hour ago                │  │
│  │                     [ REVIEW ]  │  │
│  └─────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

#### Ecrã de Review de Disputa:
```
┌────────────────────────────────────────┐
│  ←  Dispute #47                        │
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  │         [DISPUTED PHOTO]       │   │
│  │      (Screenshot blocked)      │   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  Job Details:                          │
│  • Price: €0.50                        │
│  • Location requested: 38.73, -9.21   │
│  • Location taken: 38.73, -9.21       │
│  • Distance: 7m ✓                      │
│                                        │
│  Requester (user_789):                 │
│  "Wrong location - this is not        │
│   the building I requested"            │
│                                        │
│  Photographer (user_123):              │
│  Rating: 4.9 ⭐ | Jobs: 23            │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  Decision:                             │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ ✓ APPROVE PHOTO                 │  │
│  │   Photographer gets paid        │  │
│  │   Requester loses dispute       │  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ ✗ REJECT PHOTO                  │  │
│  │   Refund to requester           │  │
│  │   Strike to photographer        │  │
│  └─────────────────────────────────┘  │
│                                        │
│  Admin Notes (optional):               │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

---

#### 2.3.5 Analytics (View Analytics)

```
┌────────────────────────────────────────┐
│  ←  Analytics             📅 This Week │
├────────────────────────────────────────┤
│                                        │
│  Revenue                               │
│  ┌────────────────────────────────┐   │
│  │  €1,247.50                     │   │
│  │  ▲ 15% from last week          │   │
│  └────────────────────────────────┘   │
│                                        │
│  Jobs                                  │
│  ┌────────────────────────────────┐   │
│  │  Created: 156                  │   │
│  │  Completed: 142                │   │
│  │  Disputed: 8                   │   │
│  │  Expired: 6                    │   │
│  └────────────────────────────────┘   │
│                                        │
│  Users                                 │
│  ┌────────────────────────────────┐   │
│  │  New: 23                       │   │
│  │  Active: 89                    │   │
│  │  Banned: 1                     │   │
│  └────────────────────────────────┘   │
│                                        │
│  Top Photographers                     │
│  1. user_123 - 45 jobs - €56.20       │
│  2. user_456 - 38 jobs - €41.00       │
│  3. user_789 - 31 jobs - €35.50       │
│                                        │
└────────────────────────────────────────┘
```

---

## 3. Especificações Técnicas

### 3.1 Novos Ficheiros a Criar

```
src/
├── screens/
│   ├── OnboardingScreen.js      # Tutorial inicial
│   ├── SplashScreen.js          # Loading screen
│   └── admin/
│       ├── AdminDashboard.js    # Dashboard principal
│       ├── CreateTestJob.js     # Criar jobs de teste
│       ├── PhotoReviewer.js     # Ver fotos (reusa componente existente)
│       ├── ManageUsers.js       # Gestão de utilizadores
│       ├── DisputesList.js      # Lista de disputas
│       ├── DisputeReview.js     # Revisão individual
│       └── Analytics.js         # Estatísticas
├── components/
│   ├── OnboardingSlide.js       # Componente de slide
│   ├── ProgressBar.js           # Barra de progresso
│   └── admin/
│       ├── StatCard.js          # Card de estatística
│       ├── UserCard.js          # Card de utilizador
│       └── DisputeCard.js       # Card de disputa
└── utils/
    └── adminHelpers.js          # Funções admin
```

### 3.2 Navegação

```javascript
// App.js ou Navigation.js

const Stack = createNativeStackNavigator();

// Stack principal
<Stack.Navigator>
  <Stack.Screen name="Splash" component={SplashScreen} />
  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
  <Stack.Screen name="Main" component={MainTabs} />
  
  {/* Admin Screens */}
  <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
  <Stack.Screen name="CreateTestJob" component={CreateTestJob} />
  <Stack.Screen name="PhotoReviewer" component={PhotoReviewer} />
  <Stack.Screen name="ManageUsers" component={ManageUsers} />
  <Stack.Screen name="DisputesList" component={DisputesList} />
  <Stack.Screen name="DisputeReview" component={DisputeReview} />
  <Stack.Screen name="Analytics" component={Analytics} />
</Stack.Navigator>
```

### 3.3 Storage para Onboarding

```javascript
// Verificar se é primeira vez
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkFirstLaunch = async () => {
  const hasLaunched = await AsyncStorage.getItem('hasLaunched');
  if (hasLaunched === null) {
    return true; // É primeira vez
  }
  return false;
};

const setFirstLaunchComplete = async () => {
  await AsyncStorage.setItem('hasLaunched', 'true');
};
```

### 3.4 Admin Authentication

```javascript
// adminHelpers.js

const ADMIN_USERS = [
  { email: 'sergio@echo.app', id: 'admin_001' },
  // Adicionar mais admins conforme necessário
];

export const isUserAdmin = (user) => {
  return ADMIN_USERS.some(
    admin => admin.email === user.email || admin.id === user.id
  );
};
```

---

## 4. Fluxos de Teste

### 4.1 Flow Completo de Teste

Para testar a app end-to-end, o admin pode:

```
1. ADMIN cria Job de Teste
   ↓
2. USER 1 (Photographer) vê job no mapa
   ↓
3. USER 1 aceita job (está dentro de 10m)
   ↓
4. USER 1 tira foto usando o radar
   ↓
5. USER 2 (Requester) recebe notificação
   ↓
6. USER 2 tem 30 segundos para ver (sem screenshot)
   ↓
7a. USER 2 ACEITA → Photographer recebe €
   ↓
7b. USER 2 REJEITA → Disputa criada
   ↓
8. ADMIN revê disputa no Dashboard
   ↓
9. ADMIN decide: Aprovar ou Rejeitar
   ↓
10. Resultado aplicado (pagamento ou refund)
```

### 4.2 Checklist de Teste

| # | Teste | Esperado | Status |
|---|-------|----------|--------|
| 1 | Abrir app primeira vez | Ver Splash + Onboarding | ⬜ |
| 2 | Completar onboarding | Permissões pedidas, ir para mapa | ⬜ |
| 3 | Abrir app segunda vez | Ir directo para mapa (skip onboarding) | ⬜ |
| 4 | Admin criar job | Job aparece no mapa | ⬜ |
| 5 | User aceitar job | Navegar para câmara | ⬜ |
| 6 | Radar funcionar | Cone aponta para job correctamente | ⬜ |
| 7 | Tirar foto | Foto enviada, notificação ao requester | ⬜ |
| 8 | Ver foto 30s | Timer visível, screenshot bloqueado | ⬜ |
| 9 | Aceitar foto | Photographer recebe pagamento | ⬜ |
| 10 | Rejeitar foto | Disputa criada | ⬜ |
| 11 | Admin ver disputa | Foto visível, decisão possível | ⬜ |
| 12 | Resolver disputa | Resultado aplicado correctamente | ⬜ |

---

## 📝 Notas Finais

### Prioridades de Implementação:

1. **Alta** - Splash Screen + Loading
2. **Alta** - Admin Dashboard básico
3. **Alta** - Criar Job de Teste
4. **Média** - Onboarding Tutorial
5. **Média** - Review de Disputas
6. **Baixa** - Analytics
7. **Baixa** - Gestão de Users completa

### Próximos Passos:

1. Criar estrutura de ficheiros
2. Implementar Splash Screen
3. Implementar Admin Dashboard
4. Testar flow completo
5. Iterar e refinar

---

**Documento criado para ECHO APP**  
**Versão 2.0 - Dezembro 2024**
