#!/bin/bash
# prompt-context (Food Rescue): inject relevant invariants + lesson INDEX hits when the
# prompt mentions matching keywords. Project-scoped; runs synchronously (timeout 1s).
# Adapted from kaka/cricmax-prompt-context.sh.
set -e

# Only fire inside this repo.
[[ "$PWD" != *"Rajyash-Foundation"* ]] && exit 0

PROMPT=$(jq -r '.prompt // ""' < /dev/stdin 2>/dev/null || echo "")
[[ -z "$PROMPT" ]] && exit 0

LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')
TAGS=()
INVARIANTS=()

if echo "$LOWER" | grep -qE 'form|zod|validation|react.hook.form|rhf'; then
  TAGS+=("forms")
  INVARIANTS+=("Forms = shared Form* field components + RHF + zodResolver. Never hand-wire register on raw Input. Zod v4: { error: 'msg' }, { message: 'msg' }")
fi
if echo "$LOWER" | grep -qE 'mock|adapter|mapper|service|feature.slice'; then
  TAGS+=("frontend")
  INVARIANTS+=("Every <Feature>Service.ts MUST have a Mock<Feature>Service.ts (frozen). Adapter/mapper layer mandatory — no raw DB/API rows in JSX. Add real method -> add mock too")
  INVARIANTS+=("Thin pages: app/**/page.tsx orchestrates only. Logic lives in src/features/<name>/. Cross-feature imports via index.ts barrel")
fi
if echo "$LOWER" | grep -qE 'state|zustand|tanstack|react.query|query.key'; then
  TAGS+=("frontend")
  INVARIANTS+=("Server state -> TanStack Query feature hook; UI state -> Zustand (one store/feature, reset deps in setters); QUERY_KEYS centralized in config/constants.ts")
fi
if echo "$LOWER" | grep -qE 'auth|otp|login|sign.?in|session'; then
  TAGS+=("auth")
  INVARIANTS+=("Auth = email + phone OTP. Authorize on server-side role, never on a client-sent role/clientId. Validate env (Zod) at boot")
fi
if echo "$LOWER" | grep -qE 'payment|razorpay|upi|donat|checkout'; then
  TAGS+=("payments")
  INVARIANTS+=("Verify payment server-side via gateway webhook/signature — never trust client success callback. Money amounts in integer minor units")
fi
if echo "$LOWER" | grep -qE 'map|track|location|geo|pickup.route|live'; then
  TAGS+=("maps-tracking")
  INVARIANTS+=("Pickup status is server-owned source of truth (requested/accepted/picked/delivered). Keep map/provider key server-side where possible")
fi
if echo "$LOWER" | grep -qE 'notif|email|sms|whatsapp|push'; then
  TAGS+=("notifications")
  INVARIANTS+=("Notifications fan out across in-app/email/SMS/WhatsApp/push — send through one dispatch layer, not inline per call site. Make sends idempotent")
fi
if echo "$LOWER" | grep -qE 'migration|schema|prisma|drizzle|database|postgres'; then
  TAGS+=("db")
  INVARIANTS+=("Schema changes go through the ORM migration tool with a checked-in migration + rollback. No ad-hoc prod SQL")
fi
if echo "$LOWER" | grep -qE 'test|vitest|testing.library'; then
  TAGS+=("testing")
  INVARIANTS+=("Test only what could really break (Zod schemas, logic hooks, mappers, stores, decision components). No test-per-file, no 'renders without throwing'")
fi

[[ ${#TAGS[@]} -eq 0 ]] && exit 0

CONTEXT="## Food Rescue invariants (matched: ${TAGS[*]})\n"
for inv in "${INVARIANTS[@]}"; do CONTEXT+="- $inv\n"; done

# Append lesson INDEX hits for matched tags.
INDEX="$PWD/.claude/lessons/INDEX.md"
[[ ! -f "$INDEX" ]] && INDEX="c:/Users/HP/Desktop/Rajyash-Foundation/.claude/lessons/INDEX.md"
if [[ -f "$INDEX" ]]; then
  HITS=$(grep -E '^- \[' "$INDEX" 2>/dev/null | grep -i -E "$(IFS='|'; echo "${TAGS[*]}")" 2>/dev/null | head -n 10 || true)
  [[ -n "$HITS" ]] && CONTEXT+="\n## Relevant lessons\n$HITS\n"
fi

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: $ctx
  }
}'
exit 0
