# Project guidance

## Product

- Product name: `Космический мусорщик`.
- Primary target: mobile VK Mini App; desktop is a constrained game shell.
- Core tension: decide whether to explore one more room or return to the starting airlock with the loot.
- Extraction is allowed only from the starting room.

## Boundaries

- The backend is the source of truth once Phase 2 starts. Never trust client resources, map contents, combat results, rewards, upgrades, or VK user IDs.
- Hidden room contents must never be sent to the client before reveal.
- Every mutating backend action must be transactional, versioned, and idempotent.
- The bot must call the application service/API instead of writing game tables directly.
- Do not touch VK resources, DNS, VDS, SSL, or production without an explicit user confirmation at that control point.
- Never commit tokens, secrets, launch parameters, database dumps, logs, or certificate material.

## Frontend

- Keep the game usable at 320x568, 360x800, 390x844, and 430x932.
- Use the existing graphite, cyan, amber, red, and steel visual system. Avoid purple gradients and generic VKUI/SaaS layouts.
- Controls must be at least 44x44 CSS pixels and respect safe-area insets.
- Use VK icons for interface commands, SVG/DOM for the room map, and Motion for short transitions.
- Server state belongs in TanStack Query; Zustand is for local UI state and the Phase 1 mock only.

## Verification

From `frontend/`, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. For visual changes, inspect the target mobile viewports in a real browser and check for horizontal overflow.
