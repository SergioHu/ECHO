# ECHO App - Estado do Projecto
## Data: 28 Janeiro 2026

---

## 🔴 Situação Actual

**Builds EAS esgotados** - Próximo reset: **1 Fevereiro 2026** (4 dias)

---

## ✅ O Que Está a Funcionar
    
| Funcionalidade | Status |
|----------------|--------|
| Autenticação | ✅ Funciona |
| Mapa com localização do utilizador | ✅ Funciona |
| Markers de jobs no mapa | ✅ Funciona (quando há dados válidos) |
| Activity screen | ✅ Mostra jobs criados |
| ExpandedMapModal | ✅ Mostra markers correctamente |
| Aceitar jobs dentro de 10m | ✅ Funciona |
| Supabase connection | ✅ Funciona |
| Real-time subscription setup | ✅ Activa |

---

## 🔴 Problemas Identificados (Pendentes de Fix)

### 1. **Jobs não aparecem no load inicial do RadarScreen**
- **Sintoma**: `supabaseRequests: 0` no início, só aparecem depois de mudar de tab
- **Causa**: O fetch inicial pode não estar a disparar correctamente com `stableCoords`
- **Fix Implementado**: Adicionado `stableCoords` state - PRECISA TESTE

### 2. **Novos requests criados não aparecem automaticamente**
- **Sintoma**: Criar request → não aparece no mapa
- **Causa Possível A**: Real-time subscription não está a receber eventos INSERT
- **Causa Possível B**: Fallback refetch não está a funcionar
- **Causa Possível C**: Novos requests criados com `expires_at` no passado
- **Fix Necessário**: Verificar `useCreateRequest.js` e adicionar logs de debug

### 3. **Mensagem "You must be within 10m" aparece sempre**
- **Sintoma**: Mesmo quando estás dentro de 10m e podes aceitar, a mensagem aparece
- **Causa**: Falta condição `{!canAccept && ...}` no JSX
- **Ficheiro**: `src/components/JobOfferSheet.js`
- **Fix**: Envolver a mensagem de warning com `{!canAccept && (...)}`

### 4. **Jobs expiram rapidamente**
- **Sintoma**: Todos os jobs ficam expirados e desaparecem
- **Causa**: `expires_at` pode estar a ser definido incorrectamente
- **Verificar**: `useCreateRequest.js` - valor de `expires_at`

### 5. **Debug overlay ainda visível**
- **Fix**: Remover ou comentar o bloco vermelho de debug no `RadarScreen.js`

---

## 📁 Ficheiros Modificados Recentemente

### `src/hooks/useNearbyRequests.js`
- ✅ Subscription real-time com `[]` dependency (corre uma vez no mount)
- ✅ `updateKey` para forçar re-renders
- ✅ Logs detalhados com caixas visuais (`╔══════╗`)
- ✅ Alerts visuais para debug (INSERT received, errors)
- ✅ Refs para valores estáveis (`latRef`, `lngRef`, `userIdRef`)

### `src/screens/RadarScreen.js`
- ✅ `stableCoords` state para coordenadas estáveis
- ✅ `displayRequests` state sincronizado com `supabaseRequests`
- ✅ Debug overlay vermelho (REMOVER após fix)
- ✅ Fallback refetch após criar request
- ⚠️ `key` no MapView foi REMOVIDA (causava problemas)

### `src/components/JobOfferSheet.js`
- ⚠️ PRECISA FIX: Mensagem "within 10m" só deve aparecer quando `!canAccept`

### `src/hooks/useCreateRequest.js`
- ⚠️ PRECISA VERIFICAÇÃO: Como é definido o `expires_at`?

---

## 🔧 Fixes Pendentes (Para aplicar após 1 Fevereiro)

### Fix 1: JobOfferSheet.js - Mensagem de Warning

```javascript
// ANTES (errado):
<View style={styles.warningContainer}>
    <Text>You must be within 10m to submit the photo</Text>
</View>

// DEPOIS (correcto):
{!canAccept && (
    <View style={styles.warningContainer}>
        <Text>You must be within 10m to submit the photo</Text>
    </View>
)}
```

### Fix 2: RadarScreen.js - Fetch quando stableCoords ready

```javascript
// Adicionar este useEffect:
useEffect(() => {
    if (stableCoords && !supabaseLoading) {
        console.log('📍 stableCoords ready, triggering fetch...');
        refetchSupabaseRequests();
    }
}, [stableCoords]);
```

### Fix 3: RadarScreen.js - Fallback mais agressivo

```javascript
// No handleConfirmRequest, após sucesso:
setTimeout(() => refetchSupabaseRequests(), 500);
setTimeout(() => refetchSupabaseRequests(), 1500);
setTimeout(() => refetchSupabaseRequests(), 3000);
```

### Fix 4: RadarScreen.js - Remover Debug Overlay

Apagar ou comentar todo o bloco:
```javascript
{/* DEBUG OVERLAY - REMOVER */}
<View style={{
    position: 'absolute',
    top: 120,
    ...
}}>
```

### Fix 5: useCreateRequest.js - Verificar expires_at

Garantir que o `expires_at` é definido como:
```javascript
expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
// OU
expires_at: new Date(Date.now() + 86400000).toISOString()
```

---

## 🗄️ Queries Supabase Úteis

### Renovar requests expirados (para teste):
```sql
UPDATE requests
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE status = 'open'
AND latitude BETWEEN 38.7 AND 38.8
AND longitude BETWEEN -9.3 AND -9.1
LIMIT 10;
```

### Ver requests válidos:
```sql
SELECT id, status, expires_at, created_at,
       CASE WHEN expires_at > NOW() THEN 'VALID' ELSE 'EXPIRED' END
FROM requests
WHERE status = 'open'
AND expires_at > NOW()
ORDER BY created_at DESC;
```

### Testar RPC:
```sql
SELECT * FROM get_nearby_requests(38.74047, -9.20912, 50000);
```

### Verificar Realtime está activo:
```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'requests';
```

---

## 📊 Debug Overlay - Valores Esperados

Quando tudo funcionar, o debug overlay deve mostrar:

```
location: YES
stableCoords: 38.xxxxx, -9.xxxxx
mapReady: YES
supabaseRequests: X (onde X > 0)
displayRequests: X (igual a supabaseRequests)
supabaseUpdateKey: Y
supabaseLoading: NO
supabaseError: NO
```

---

## 🚀 Próximos Passos (Após 1 Fevereiro)

1. **Aplicar todos os fixes** listados acima
2. **Fazer build** com EAS
3. **Testar**:
   - [ ] Jobs aparecem no load inicial
   - [ ] Novos requests aparecem automaticamente (ou em ~3s com fallback)
   - [ ] Mensagem "within 10m" só aparece quando necessário
   - [ ] Debug overlay removido
4. **Se real-time ainda não funcionar**, investigar:
   - Logs da subscription
   - Se Supabase Realtime está configurado correctamente
   - Se há problemas de rede/firewall

---

## 📝 Notas Adicionais

- **Supabase Realtime** foi activado para a tabela `requests` (verificado via MCP)
- **Função RPC `get_nearby_requests`** filtra por `status = 'open'` AND `expires_at > NOW()`
- **Circle offset bug** no Android foi corrigido com compensação de coordenadas
- **MapView key** foi removida porque destruía o mapa inteiro a cada update

---

## 🔗 Links Úteis

- **Expo Dashboard**: https://expo.dev/accounts/sudosergio/projects/echo-app
- **GitHub Repo**: https://github.com/SergioHu/ECHO
- **Supabase Dashboard**: (aceder via MCP ou browser)

---

## 📅 Timeline

| Data | Evento |
|------|--------|
| 23 Jan 2026 | Identificado problema dos markers não aparecerem |
| 27 Jan 2026 | Encontrada causa: requests expirados |
| 28 Jan 2026 | Builds EAS esgotados |
| 1 Fev 2026 | Reset dos builds - continuar fixes |

---

*Documento criado: 28 Janeiro 2026*
*Última actualização: 28 Janeiro 2026*