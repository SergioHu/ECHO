#!/usr/bin/env python3
"""
inspect_screen.py — ECHO Frontend Inspector static helper
Runs fast regex-based checks against a JS/JSX file and prints structured findings.
Complements (does not replace) the LLM's semantic analysis in SKILL.md.

Usage:
    python inspect_screen.py <file_or_dir> [<file_or_dir> ...]
    python inspect_screen.py src/screens/RadarScreen.js
    python inspect_screen.py src/screens/ src/components/

Exit code: 1 if any CRITICAL or HIGH findings, 0 otherwise.
"""

import re
import sys
import os
from dataclasses import dataclass, field
from typing import List

# ---------------------------------------------------------------------------
# Check definitions
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    severity: str   # CRITICAL | HIGH | MEDIUM | LOW | COSMETIC
    check: str      # Check 1..10 label
    file: str
    line: int
    title: str
    snippet: str
    fix: str


CHECKS = [
    # (severity, check_label, title, regex, fix_hint)

    # Check 1 — Buttons
    ("HIGH",     "Check 1 — Buttons",    "Empty onPress handler",
     r"onPress=\{(\(\)\s*=>\s*\{\s*\}|null|undefined)\}",
     "Wire up the onPress handler or remove the button."),

    ("CRITICAL", "Check 1 — Buttons",    "Shutter not guarded by distance check",
     r"<(?:TouchableOpacity|Pressable|EchoButton)[^>]*onPress=\{[^}]*(?:takePicture|capturePhoto|shutter)[^}]*\}[^>]*(?!disabled)",
     "Add disabled={distanceToJob > 10} to the shutter button."),

    # Check 2 — Text & Localisation
    ("HIGH",     "Check 2 — Text",       "Placeholder text left in JSX",
     r"(?i)(lorem ipsum|TODO|FIXME|placeholder text|test data|debug text)",
     "Remove or replace the placeholder text."),

    ("MEDIUM",   "Check 2 — Text",       "Price displayed without € symbol or wrong format",
     r"(?<!['\"])(?<!\w)\d+\.?\d*\s*(?:cents|cent|eur|euro)(?!\w)",
     "Format as €X.XX using parseFloat(price_cents / 100).toFixed(2)."),

    # Check 4 — Maps
    ("CRITICAL", "Check 4 — Maps",       "tracksViewChanges disabled on marker",
     r"tracksViewChanges=\{(?:false|!)",
     "Set tracksViewChanges={true} on all job and user markers."),

    ("HIGH",     "Check 4 — Maps",       "RadarScreen zoom too tight (latitudeDelta < 0.005)",
     r"latitudeDelta:\s*0\.00[0-4]",
     "Use latitudeDelta: 0.01 (~1km visible area)."),

    ("HIGH",     "Check 4 — Maps",       "Missing dark map theme on MapView",
     r"<MapView(?![^>]*customMapStyle)",
     "Add customMapStyle={DARK_MAP_STYLE} to every MapView."),

    ("HIGH",     "Check 4 — Maps",       "Missing Google Maps provider on MapView",
     r"<MapView(?![^>]*PROVIDER_GOOGLE)",
     "Add provider={PROVIDER_GOOGLE} to every MapView."),

    # Check 6 — Forms
    ("MEDIUM",   "Check 6 — Forms",      "ScrollView with TextInput missing keyboardShouldPersistTaps",
     r"<ScrollView(?![^>]*keyboardShouldPersistTaps)",
     "Add keyboardShouldPersistTaps='handled' to ScrollView containing TextInput."),

    ("MEDIUM",   "Check 6 — Forms",      "Missing KeyboardAvoidingView on screen with TextInput",
     r"<TextInput(?!.*KeyboardAvoidingView)",
     "Wrap the form in <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}."),

    # Check 7 — Status / Feedback
    ("HIGH",     "Check 7 — Feedback",   "Alert.alert used in production error handler",
     r"Alert\.alert\(['\"](?:Error|Failed|Something went wrong)",
     "Replace with showToast(message, 'error') from useToast()."),

    ("HIGH",     "Check 7 — Feedback",   "console.log left in production screen",
     r"console\.log\(",
     "Remove console.log. Use console.error only in real error handlers."),

    # Check 8 — Visual Consistency
    ("LOW",      "Check 8 — Consistency","Hardcoded hex colour outside theme.js",
     r"['\"]#[0-9a-fA-F]{3,6}['\"]",
     "Replace with the appropriate COLORS constant from constants/theme.js."),

    ("MEDIUM",   "Check 8 — Consistency","SafeAreaView missing from top-level screen",
     r"^(?!.*SafeAreaView)(?!.*useSafeAreaInsets).*return\s*\(",
     "Wrap the screen in <SafeAreaView> or use useSafeAreaInsets()."),

    # Check 10 — Android
    ("CRITICAL", "Check 10 — Android",   "latitude/longitude passed without parseFloat()",
     r"(?:latitude|longitude)=\{(?!parseFloat)(?!0)(?!\d)[a-zA-Z_$][a-zA-Z0-9_$.?]*\}",
     "Wrap with parseFloat(value) || 0 to prevent Android bridge type crash."),

    ("CRITICAL", "Check 10 — Android",   "Number() used instead of parseFloat() for native prop",
     r"(?:latitude|longitude|width|height)=\{Number\(",
     "Replace Number() with parseFloat() — Number() can pass NaN to the Android bridge."),
]


# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

def scan_file(path: str) -> List[Finding]:
    findings: List[Finding] = []
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except OSError as e:
        print(f"[WARN] Cannot read {path}: {e}", file=sys.stderr)
        return findings

    content = "".join(lines)

    for severity, check, title, pattern, fix in CHECKS:
        for m in re.finditer(pattern, content, re.MULTILINE):
            # Find line number
            lineno = content[: m.start()].count("\n") + 1
            snippet = lines[lineno - 1].strip()[:120] if lineno <= len(lines) else ""
            findings.append(Finding(
                severity=severity,
                check=check,
                file=path,
                line=lineno,
                title=title,
                snippet=snippet,
                fix=fix,
            ))

    return findings


def collect_files(paths: List[str]) -> List[str]:
    out = []
    for p in paths:
        if os.path.isfile(p):
            out.append(p)
        elif os.path.isdir(p):
            for root, _, files in os.walk(p):
                for f in files:
                    if f.endswith((".js", ".jsx", ".ts", ".tsx")):
                        out.append(os.path.join(root, f))
        else:
            print(f"[WARN] Not found: {p}", file=sys.stderr)
    return out


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "COSMETIC": 4}

ICONS = {
    "CRITICAL": "🔴",
    "HIGH":     "🟠",
    "MEDIUM":   "🟡",
    "LOW":      "🔵",
    "COSMETIC": "⚪",
}


def report(findings: List[Finding], scanned: int) -> None:
    if not findings:
        print(f"✅ No issues found across {scanned} file(s).")
        return

    findings.sort(key=lambda f: (SEV_ORDER.get(f.severity, 99), f.file, f.line))

    current_sev = None
    for f in findings:
        if f.severity != current_sev:
            current_sev = f.severity
            print(f"\n{'='*60}")
            print(f"{ICONS[f.severity]}  {f.severity}")
            print("=" * 60)
        print(f"\n  [{f.check}] {f.title}")
        print(f"  File:    {f.file}:{f.line}")
        print(f"  Snippet: {f.snippet}")
        print(f"  Fix:     {f.fix}")

    counts = {s: 0 for s in SEV_ORDER}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for sev in SEV_ORDER:
        print(f"  {ICONS[sev]} {sev:10s}: {counts[sev]}")
    print(f"  Files scanned : {scanned}")
    print(f"  Total findings: {len(findings)}")

    has_critical = counts.get("CRITICAL", 0) > 0
    has_high = counts.get("HIGH", 0) > 0
    if has_critical or has_high:
        sys.exit(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    files = collect_files(sys.argv[1:])
    if not files:
        print("No JS/JSX files found.")
        sys.exit(0)

    all_findings: List[Finding] = []
    for fp in files:
        all_findings.extend(scan_file(fp))

    report(all_findings, len(files))
