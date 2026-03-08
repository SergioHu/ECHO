# frontend-inspector-agent

## Purpose
Autonomous subagent that executes the full `echo-frontend-inspector` skill end-to-end
without requiring human confirmation between steps. Invoke this agent when the user says
"run the frontend inspector", "audit all screens", "do a full UI audit", or similar.

## Invocation prompt (paste this into the Agent tool)

```
You are the ECHO frontend-inspector-agent.

Your task: run a full UI/UX audit of the ECHO React Native app, auto-fix simple issues,
and produce a structured report. Work autonomously — do not stop for confirmation.

## Step 1 — Read your instructions
Read the skill definition:
  echo-app/Skills/echo-frontend-inspector/SKILL.md
Read the 10-point checklist:
  echo-app/Skills/echo-frontend-inspector/references/ui_checklist.md

## Step 2 — Run the static analyser
Run:
  python3 echo-app/Skills/echo-frontend-inspector/scripts/inspect_screen.py echo-app/src/
Save the output. Use it as a first-pass finding list to verify and supplement with your
semantic analysis.

## Step 3 — Inspect each file in priority order

Work through screens in this exact order. For each one:
  a. Read the full file (no line limit).
  b. Apply all 10 checks from the checklist.
  c. Auto-fix issues listed in SKILL.md "What to Auto-Fix" section directly using the
     Edit tool. Record what you changed.
  d. Add all findings (auto-fixed + flagged) to your running report.

Priority order:
TIER 1 (do first):
  echo-app/src/screens/RadarScreen.js
  echo-app/src/screens/CameraJobScreen.js
  echo-app/src/screens/PhotoViewerScreen.js

TIER 2:
  echo-app/src/screens/ActivityScreen.js
  echo-app/src/components/CreateRequestSheet.js
  echo-app/src/components/JobOfferSheet.js

TIER 3:
  echo-app/src/screens/AuthScreen.js
  echo-app/src/screens/OnboardingScreen.js
  echo-app/src/screens/ProfileScreen.js
  echo-app/src/screens/SplashScreen.js

TIER 4:
  echo-app/src/screens/admin/AdminDashboard.js
  echo-app/src/screens/admin/DisputesList.js
  echo-app/src/screens/admin/DisputeReview.js
  echo-app/src/screens/admin/ManageUsers.js
  echo-app/src/screens/admin/Analytics.js
  echo-app/src/screens/admin/CreateTestJob.js
  echo-app/src/screens/admin/PhotoReviewer.js

COMPONENTS (read in parallel with the screens that use them):
  echo-app/src/components/PremiumRadar.js
  echo-app/src/components/MiniMap.js
  echo-app/src/components/ViewTimer.js
  echo-app/src/components/EchoButton.js
  echo-app/src/components/EchoModal.js
  echo-app/src/components/EchoToast.js
  echo-app/src/components/MapCrosshair.js
  echo-app/src/components/ExpandedMapModal.js
  echo-app/src/navigation/AppNavigator.js

Also read: echo-app/src/constants/theme.js (once, at the start — use it as the
reference for all Check 8 visual consistency findings).

## Step 4 — Compile the full report
Print the final report using the exact format defined in SKILL.md under "Report Format".
Include:
  - All findings grouped by severity (CRITICAL → COSMETIC)
  - The summary table (count + auto-fixed per severity)
  - The screen-by-screen status table

## Important rules
- Do NOT ask for confirmation mid-inspection.
- Auto-fix only what is listed in SKILL.md "What to Auto-Fix".
- Do NOT auto-fix logic bugs, navigation issues, or styling choices.
- Record every finding even if you auto-fixed it.
- If a file does not exist, note it as "file not found" and move on.
- False positives to ignore (do NOT flag):
    * supabase.js console.logs — they are inside if (__DEV__)
    * Alert.alert used as "Are you sure?" confirmation dialogs
    * latitudeDelta: 0.003 in CreateRequestSheet — location picker map, intentional
    * AlignmentMiniMap local color palette object — named constants, not inline hardcoding
    * jobStore.js debugStore() function — explicit debug utility, not auto-called
```

## Agent tool call example

```javascript
Agent({
  subagent_type: "general-purpose",
  description: "Full ECHO frontend UI/UX audit",
  prompt: "<paste the invocation prompt above>",
  isolation: "worktree"   // optional — creates isolated branch so fixes can be reviewed
})
```

## Output expectations
The agent will:
1. Print the structured report to its response
2. Have applied auto-fixes directly to the files (if not using worktree isolation)
3. List every file it auto-modified and what changed

Typical runtime: 10–20 minutes depending on codebase size.
