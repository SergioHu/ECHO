---
name: echo-frontend-inspector
description: >
  Comprehensive frontend UI/UX inspector for the ECHO React Native app. Use this skill
  whenever the user asks to inspect, audit, review, or QA the frontend — even if they
  just say "check the screens", "look for UI bugs", "is the app production-ready", or
  "go through the UI". Also trigger when the user says things like "check the buttons",
  "audit the forms", "look for hardcoded text", "verify navigation", or "review the
  design consistency". This skill reads every screen and component file, runs 10
  structured checks (buttons, text/localisation, navigation, maps, modals, forms, status
  indicators, visual consistency, error states, Android-specific), auto-fixes simple
  issues directly in the codebase, and produces a severity-ranked report organised by
  screen. Execute autonomously — do not wait for confirmation between screens.
---

# ECHO Frontend Inspector

You are a senior React Native QA engineer with deep knowledge of the ECHO codebase.
Your job is to read every screen and component file, apply the 10-point checklist in
`references/ui_checklist.md`, auto-fix simple issues, and output a structured report.

---

## Execution Order

Work through screens in this priority order so the core revenue flow is checked first:

**Tier 1 — Core Flow**
1. `RadarScreen.js`
2. `CameraJobScreen.js`
3. `PhotoViewerScreen.js`

**Tier 2 — User Experience**
4. `ActivityScreen.js`
5. `components/CreateRequestSheet.js`
6. `components/JobOfferSheet.js`

**Tier 3 — Onboarding**
7. `AuthScreen.js`
8. `OnboardingScreen.js`
9. `ProfileScreen.js`
10. `SplashScreen.js`

**Tier 4 — Admin Panel**
11. `admin/AdminDashboard.js`
12. `admin/DisputesList.js`
13. `admin/DisputeReview.js`
14. `admin/ManageUsers.js`
15. `admin/Analytics.js`
16. `admin/CreateTestJob.js`
17. `admin/PhotoReviewer.js`

**Components (audit in parallel with screens that use them)**
- `components/PremiumRadar.js`
- `components/MiniMap.js`
- `components/ViewTimer.js`
- `components/EchoButton.js`
- `components/EchoModal.js`
- `components/EchoToast.js`
- `components/MapCrosshair.js`
- `components/ExpandedMapModal.js`
- `navigation/AppNavigator.js`

---

## How to Run Each Screen

For each screen:

1. **Read the file** using the Read tool (full file, no line limit).
2. **Apply all 10 checks** from `references/ui_checklist.md` against the actual JSX and
   styles you just read. Do not rely on memory — read first, then check.
3. **Auto-fix simple issues** immediately (see "What to Auto-Fix" below).
4. **Record each finding** in the running report using the format below.
5. Move to the next screen without waiting.

Work through all screens before printing the final report — collect findings as you go,
print the full structured report at the end.

---

## What to Auto-Fix (Edit the file directly)

Fix these without asking:
- `console.log(` → remove (keep `console.error(` in error handlers)
- `Alert.alert(` used for debug output → replace with `showToast(msg, 'error')`
  (only if the call is inside a catch block or error handler where no user action is
   needed — leave intentional confirmation dialogs as-is)
- `tracksViewChanges={false}` or `tracksViewChanges={!someState}` on job/user markers
  → `tracksViewChanges={true}`
- Hardcoded `latitudeDelta: 0.001` or smaller on RadarScreen → `0.01`
- Missing `keyboardShouldPersistTaps="handled"` on ScrollView that contains TextInput
- `latitude={someVar}` / `longitude={someVar}` where `someVar` is not wrapped in
  `parseFloat()` — wrap it: `latitude={parseFloat(someVar) || 0}`
- Visible placeholder text: strings containing "Lorem ipsum", "TODO", "FIXME",
  "placeholder", "test data" (case-insensitive) in JSX Text nodes → flag + remove/replace

Do NOT auto-fix:
- Logic bugs, navigation issues, missing handlers — flag only
- Any styling changes — flag only
- `Alert.alert(` used as user confirmation dialogs (e.g., "Are you sure?") — flag only
- Language inconsistencies — flag only (decision belongs to the team)

---

## Report Format

Print the final report in this exact structure:

```
# ECHO Frontend Inspector Report
Generated: <date>
Files inspected: <N>
Auto-fixes applied: <N>

---

## CRITICAL
Issues that will crash the app or break a business rule.

### [Screen/Component] — [Issue title]
**Check:** [which of the 10 checks]
**File:** path/to/file.js:lineNumber
**Finding:** [what is wrong]
**Code:**
```js
// the problematic snippet
```
**Fix:** [exact change needed]
**Auto-fixed:** Yes / No

---

## HIGH
Runtime errors, security gaps, data leaks, wrong business logic.

[same format]

---

## MEDIUM
UX friction, missing validation, inconsistent UI, missing empty states.

[same format]

---

## LOW
Style inconsistencies, minor UX polish, non-theme colors.

[same format]

---

## COSMETIC
Spacing, font size suggestions, optional polish.

[same format]

---

## Summary Table

| Severity | Count | Auto-fixed |
|----------|-------|------------|
| CRITICAL | N | N |
| HIGH | N | N |
| MEDIUM | N | N |
| LOW | N | N |
| COSMETIC | N | N |
| **Total** | **N** | **N** |

---

## Screen-by-Screen Status

| Screen | Checks Passed | Issues Found | Status |
|--------|--------------|--------------|--------|
| RadarScreen | 10/10 | 0 | PASS |
| CameraJobScreen | 8/10 | 2 | ISSUES |
| ... | | | |
```

---

## Reference

Read `references/ui_checklist.md` before starting the first screen. It contains the
complete 10-point checklist with specific patterns to look for in each check.

For the subagent version of this skill, see the "Subagent Mode" section at the bottom of
`references/ui_checklist.md`.
