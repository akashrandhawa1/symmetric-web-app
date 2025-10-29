# Coaching Overrides

## Stop Suggestions
- The coach now surfaces stop guidance as a non-blocking banner and a rest card instead of interrupting the session.
- Banner headline: `Coach suggests stopping this set` (or `…exercise` when scoped to the whole exercise).
- Actions: `End set`/`End exercise`, `Continue anyway`, `Why?` inline rationale (up to two reasons), overflow menu with `Skip set`, `Skip exercise`, and `Don’t suggest stops again today`.
- Rest Coach Sheet mirrors the suggestion as the first card with the same actions.
- Suggestions auto-hide after ~6.5 seconds but remain available in the rest sheet until the user acts or continues.

## Session Preference
- Overflow toggle `Don’t suggest stops again today` flips the session-scoped flag (`suppressStopsForSession`). Turning it on hides further suggestions for the current session only.
- Undo is available for 5 seconds after `End set`, `Skip set`, or `Skip exercise`. Undo restores the prior training state.

## Real-time Fatigue Detector (feature flagged)
- Controlled by `FEATURE_FATIGUE_DETECTOR` (default `true`). Toggle off to fall back to legacy coaching.
- Detector runs per set using windowed RMS or per-rep peaks and tracks three states: **Rise**, **Plateau**, **Fall**.
- Banners:
  - Rise: “Recruitment increasing to hold pace. Keep form crisp.”
  - Plateau: “Holding steady. You likely have 1–3 quality reps.”
  - Fall: “Quality slipping (activation falling). Recommendation: end set.” (adds `Continue anyway` / `End set` CTA).
- Telemetry: `fatigue.state_change`, `fatigue.cta_shown`, `fatigue.user_choice`, `fatigue.set_tagged`.
- Sets are tagged `fatigueLimited` when fall persists ≥5 s or ≥2 reps; surfaced in session summary for downstream coaching.

## Analytics Events
All events include `sessionId` (UUID) and ISO `timestamp`.

| Event | Additional fields |
| --- | --- |
| `coach_stop_suggested` | `target`, `reasons`, `confidence`, `stage`, `repIndex` |
| `user_accept_stop` | `target`, `stage`, `repIndex` |
| `user_override_continue` | `target`, `stage`, `repIndex` |
| `user_skip_set` | `stage`, `repIndex` |
| `user_skip_exercise` | `exerciseId`, `stage` |
| `coach_toggle_suppress_today` | `on`, `stage` |

`stage` reflects the session phase (`active` or `set-summary`), and `repIndex` is the current rep count within the active set when relevant.***
