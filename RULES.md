# RULES FOR THE CODING AGENT (read before every task)

## Workflow
1. Inspect the repo first. Preserve existing conventions. Do not replace working code without a reason.
2. Work on ONE phase at a time (see `prompts/`). Do not start the next phase.
3. Before finishing a phase: run `typecheck`, `build`, `test`, and the phase exit check. Show the real output.
4. Never claim something works unless you ran it. Say what you could not verify.
5. Commit small, with clear messages. Do not delete tests to make them pass.

## Architecture rules
- `src/domain/` and `src/services/` must NOT import React or any UI code.
- The paper model (JSON validated by Zod) is the single source of truth.
- Preview, PDF and DOCX are renderers of the model. Never render one from another.
- Content is separate from template. Changing a template or setting must never change question text.
- IDs are stable (nanoid). Visible question numbers are derived, never used as identifiers.
- Media is stored as Blobs in IndexedDB, referenced by ID. No base64 in the model.
- Parsing and export logic lives in services, not in components.
- Keep files small and typed. No `any` without a comment explaining why.

## Content integrity (most important)
- Never rewrite, correct, translate or paraphrase imported text.
- Never invent missing words, options, equations, diagrams or answers.
- Never infer a correct answer.
- Uncertain content becomes a reviewable item with a warning. Never silently discard it.
- Keep the original uploaded file if parsing fails.

## UI rules
- shadcn/ui components and lucide-react icons. No emoji in the interface.
- No dead buttons. If a feature is not built, hide it or disable it with a clear reason.
- Every control has a label, a visible focus state and keyboard access.
- Provide empty, loading, error and success states.
- Paper preview is black-and-white print styling regardless of app theme.

## Honesty rules
- No mock behavior standing in for real import or export.
- Do not report an export as successful unless the file was actually produced.
- If opening the print dialog is all that happened, say "print dialog opened", not "PDF downloaded".
- Report limitations plainly in the UI and in the final summary.

## Language and fonts
- Bundle Noto Sans Devanagari and a Latin serif/sans via `@fontsource`.
- Always wait for `document.fonts.ready` before measuring layout.
- DOCX fonts: use Mangal or Nirmala UI for Devanagari, Times New Roman or Arial for Latin, with proper `cs` / `eastAsia` font slots.

## Final report format (end of every phase)
- What was built
- Files changed
- Commands run and their real results
- Exit check result (pass/fail with evidence)
- Known limitations
- Suggested next step
