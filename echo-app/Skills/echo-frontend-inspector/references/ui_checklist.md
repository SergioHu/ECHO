# ECHO UI/UX Checklist — 10 Checks

Apply every check to every file. Mark each as PASS / FAIL / N/A.

---

## Check 1: Button Audit

**Goal:** Every interactive element must be functional, correctly styled, and handle all
states.

Scan for every `TouchableOpacity`, `TouchableHighlight`, `Pressable`, `Button`,
`EchoButton`, and FAB.

For each one, verify:

| Criterion | What to look for |
|-----------|-----------------|
| `onPress` handler | Handler is defined and non-empty (not `() => {}` or `onPress={null}`) |
| Disabled state | If the button can be logically disabled (e.g., shutter when >10m, submit while loading), check `disabled={...}` prop is wired up correctly |
| Loading state | Buttons that trigger async ops (submit, create request, login) should show a spinner or disable during loading |
| EchoButton usage | Core action buttons should use `<EchoButton>` — custom `TouchableOpacity` with an action label is a flag unless it has a visual reason |
| Haptic feedback | Accept job, submit photo, report — check for `Haptics.impactAsync()` or similar |

**Key buttons to check specifically:**
- RadarScreen: "Ask Echo" FAB — `onPress` opens CreateRequestSheet
- JobOfferSheet: Accept button — calls `lockRequest`, shows loading, navigates to CameraJobScreen on success
- JobOfferSheet: Decline button — dismisses sheet cleanly
- CameraJobScreen: Shutter — `disabled={distanceToJob > 10}` or equivalent
- PreviewScreen / AgentPreviewScreen: Submit + Retake — both wired up
- PhotoViewerScreen: "Report" — opens report modal; "Approve" (if shown) — calls approve flow
- ActivityScreen: "VIEW PHOTO" — navigates to PhotoViewerScreen with correct params
- Admin DisputeReview: Approve / Reject — call correct RPC, show loading, navigate back with refresh param
- All screens: Hardware back (Android) and navigation header back — do not leave jobs stuck locked

**Common failures:**
- `onPress={() => {}}` (empty handler — TODO left in)
- Shutter not disabled beyond 10m
- Submit button not showing loading state while `uploading === true`
- Back press on CameraJobScreen not calling `unlock_request` (must use `beforeRemove` + `await`)

---

## Check 2: Text & Localisation

**Goal:** No placeholder text, consistent language, correct numeric formatting.

Scan all `<Text>` JSX nodes and string literals.

| Criterion | Pattern to find | Expected |
|-----------|----------------|----------|
| Language consistency | Mix of PT-PT and EN strings in the same screen | Pick one, flag the other |
| Placeholder text | `/lorem ipsum/i`, `/TODO/i`, `/FIXME/i`, `/test data/i`, `/placeholder/i` in Text nodes | Must be removed |
| Price formatting | Prices displayed as `50` or `0.5` instead of `€0.50` | Always `€X.XX` |
| Distance formatting | Distance shown without unit | Always append `m` or `km` |
| Countdown timer | Timer shown as raw ms instead of `MM:SS` or `SS s` | Formatted |
| Empty states | Screens that can have empty lists (ActivityScreen, RadarScreen with no jobs) | Must have a visible empty state message — not a blank screen |
| Font usage | Hardcoded font strings like `fontFamily: 'Arial'` or `fontSize: 17` outside theme | Use `SIZES.*` and `FONTS.*` from theme.js |

---

## Check 3: Navigation & Flow

**Goal:** Every screen transition is correct and back-press behavior is safe.

Read `navigation/AppNavigator.js` first to understand the full route map.

| Check | What to verify |
|-------|---------------|
| Back press on CameraJobScreen | Uses `navigation.addListener('beforeRemove', ...)` + `e.preventDefault()` + `await unlock_request(...)` + `navigation.dispatch(e.data.action)` — NOT `useEffect` cleanup |
| Back press on PhotoViewerScreen | Navigates back cleanly; does NOT leave timer running if photo is expired |
| Tab navigator | Radar / Activity / Profile tabs all render their screens; `useFocusEffect` triggers refetch on tab focus |
| Admin route guard | Admin screens check `profile.role === 'admin'` — not just `isAdmin` derived from a local state that could be stale |
| Onboarding skip | First-launch flag persists across restarts (AsyncStorage) |
| Deep link params | PhotoViewerScreen receives `supabasePhotoId` — check the param name matches what ActivityScreen passes |
| Rapid back press | CameraJobScreen's `beforeRemove` listener — does `e.preventDefault()` fire only once? (no double-unlock) |

---

## Check 4: Map & Visual Components

**Goal:** All map components render correctly with the dark theme and no visual glitches.

| Component | What to check |
|-----------|--------------|
| RadarScreen MapView | `customMapStyle={DARK_MAP_STYLE}` present; `provider={PROVIDER_GOOGLE}` present |
| RadarScreen Markers | `tracksViewChanges={true}` on ALL job markers (not `{!someState}`); price bubble text readable |
| RadarScreen initial region | `latitudeDelta: 0.01` (not `0.001`) — tighter zoom hides most markers |
| PremiumRadar | Positioned absolutely, top-left, not blocking camera shutter area |
| MiniMap | `tracksViewChanges={true}` on both job and user markers; no frozen state logic |
| Circle overlays | Android has a known offset bug on `<Circle>` — check if radius compensation or a workaround is present |
| ExpandedMapModal | Full screen, dark map theme, closes correctly |
| MapCrosshair | Centered correctly, visible on dark background |

---

## Check 5: Bottom Sheets & Modals

**Goal:** All sheets and modals open/close smoothly and do not leave state leaks.

| Component | What to check |
|-----------|--------------|
| CreateRequestSheet | `visible` prop wired; `onClose` resets form state (location, description, price); location picker modal closes independently |
| JobOfferSheet | `visible` prop wired; Accept triggers `lockRequest` and transitions to CameraJobScreen; Decline closes without side effects |
| EchoModal | Backdrop closes modal; `onClose` prop fires; animation present |
| ExpandedMapModal | Full-screen takeover; dismiss returns to CreateRequestSheet with selected coords |
| Report modal (PhotoViewerScreen) | Opens on "Report" press; requires reason selection before submitting; shows loading state |

Look for:
- `visible` never set back to `false` (sheet stuck open)
- `onClose` not resetting form fields (dirty form shown next time)
- Modal rendered unconditionally (always mounted even when hidden) — minor perf issue, flag as LOW

---

## Check 6: Form Inputs & Validation

**Goal:** All forms validate before submission and give clear feedback on errors.

| Screen | Fields | Validation rules |
|--------|--------|-----------------|
| CreateRequestSheet | Location (required), Description (optional), Price (default €0.50, must be > 0) | Block submit if no location selected; show error toast |
| AuthScreen | Email (required, valid format), Password (required, ≥ 6 chars) | Show inline error or toast; block submit |
| ProfileScreen | Display name (non-empty if edited) | Block save if empty |
| Admin DisputeReview | Resolution notes | Required before approve/reject |
| Admin ManageUsers | Search field | Min 2 chars before triggering search (debounced) |

Look for:
- `onSubmit` called without checking if required fields are filled
- No `keyboardShouldPersistTaps="handled"` on `ScrollView` containing `TextInput`
  (tapping outside keyboard on iOS dismisses the form)
- `KeyboardAvoidingView` missing on screens with TextInput near the bottom
- Price input accepts non-numeric input without sanitisation

---

## Check 7: Status Indicators & Feedback

**Goal:** Every async operation has visible loading feedback and every status is clearly
communicated.

| Element | What to verify |
|---------|---------------|
| EchoToast | Used for success/error/info (not `Alert.alert` in production flows); `showToast` available via `useToast()` context |
| Loading spinners | `ActivityIndicator` visible while `loading === true` in: createRequest, lockRequest, submitPhoto, startViewSession, loadProfile |
| Pull-to-refresh | `RefreshControl` present and wired in ActivityScreen |
| Status badges | All 6 request statuses have a badge: `open` (cyan), `locked` (yellow), `fulfilled`/`completed` (green), `expired` (grey), `disputed` (orange), `rejected` (red) |
| ViewTimer | Color transitions: normal → white, ≤30s → yellow pulse, ≤10s → red pulse. Check `ViewTimer.js` implements these three states |
| Distance indicator CameraJobScreen | Updates in real-time; changes color or style at 10m threshold |

---

## Check 8: Visual Consistency

**Goal:** All screens conform to the dark design system defined in `constants/theme.js`.

| Check | Pattern |
|-------|---------|
| Background color | `backgroundColor: COLORS.background` (`#121212`) — not hardcoded hex |
| Card/surface color | `backgroundColor: COLORS.surface` (`#1E1E1E`) — not hardcoded |
| Accent color | `COLORS.accent` (`#00E5FF`) for primary CTAs |
| Danger color | `COLORS.danger` (`#FF3B30`) for destructive actions |
| Spacing | `SPACING.xs/sm/md/lg/xl` — not raw pixel values for padding/margin |
| Font sizes | `SIZES.*` from theme — not raw numbers |
| SafeAreaView | Every top-level screen uses `SafeAreaView` or `useSafeAreaInsets()` |
| Keyboard avoidance | `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` on all screens with TextInput |
| Dark map theme | `customMapStyle={DARK_MAP_STYLE}` on every MapView |
| Debug artifacts | No visible debug text, red borders, or test markers in JSX |

---

## Check 9: Edge Cases & Error States

**Goal:** The app handles all failure modes gracefully — never shows a blank screen or
crashes silently.

| Edge case | What to look for |
|-----------|-----------------|
| Location permission denied | RadarScreen and CameraJobScreen must show a permission request UI or a fallback message — not crash or show blank map |
| Camera permission denied | CameraJobScreen must show a permission request flow |
| Network error | RPC/fetch errors caught in all hooks; `error` state rendered in UI (not swallowed) |
| Empty job list | RadarScreen with no nearby jobs: show "No requests nearby" message |
| Empty activity | ActivityScreen with no history: show "No activity yet" empty state |
| Expired job | If agent taps an expired marker, `lockRequest` fails — error toast shown |
| Already-locked job | `lockRequest` returns `{ success: false, error: 'Request already taken' }` — handled with toast, NOT crash |
| Photo expired | PhotoViewerScreen entered with an already-expired photo — `start_view_session` returns `already_expired: true` — screen shows expired state immediately |

---

## Check 10: Android-Specific

**Goal:** No type crashes on the Android native bridge; no rendering issues on Android.

| Check | Pattern | Rule |
|-------|---------|------|
| Coordinate types | All `latitude` / `longitude` props passed to MapView, Marker, Circle | Must use `parseFloat(val) \|\| 0` — not raw string, not `Number()` |
| SVG dimensions | `width`, `height`, `r`, `cx`, `cy` in SVG/react-native-svg | Must be `parseFloat()` or literal numbers — not template strings |
| Animated values | Values passed to `Animated.Value()`, `useSharedValue()` | Must be numbers — not strings |
| Price display | `job.price` or `job.price_cents` displayed numerically | Use `parseFloat(job.price).toFixed(2)` |
| Distance display | Distance calculated via Haversine — result should be `parseFloat(R * 2 * ...)` | Already handled in mapUtils — verify it's used everywhere |
| Screenshot blocking | PhotoViewerScreen | `ScreenCapture.preventScreenCaptureAsync()` called in `useEffect` with `allowScreenCaptureAsync()` cleanup |
| Camera fills screen | CameraJobScreen `<CameraView>` style | `flex: 1` or explicit dimensions — not `height: undefined` |

---

## Subagent Mode

When the `echo-frontend-inspector` skill is invoked as a subagent with the task of doing
a full autonomous inspection, the agent should:

1. Read this checklist file in full (you are reading it now).
2. Read `SKILL.md` for the execution order and report format.
3. Start with Tier 1 screens (RadarScreen, CameraJobScreen, PhotoViewerScreen).
4. For each screen: Read → Check all 10 → Auto-fix → Record findings.
5. Proceed through Tier 2, 3, and 4 without stopping.
6. Read all components listed in SKILL.md.
7. Compile and print the full structured report.
8. State explicitly which files were auto-fixed and what was changed.

The agent must NOT ask for confirmation mid-inspection. It has full authority to apply
the auto-fixes listed in SKILL.md. It should flag everything else.
