# Plan for a Comprehensive Rules Audit

**Objective:** To systematically audit the application's implementation against the `Five-parsecs-from-home-3rd-edition.txt` rulebook. This process will verify correctness, identify bugs, and ensure all character and item rules are functioning as expected. The `AUDIT_CHECKLIST.md` will be our central tracking document for this effort.

---

### Phase 1: Checklist Completion

The current `AUDIT_CHECKLIST.md` is a good foundation but incomplete. The first phase is to fully populate it with all relevant rules from the source text.

1.  **Source Material:** Use `Five-parsecs-from-home-3rd-edition.txt` as the single source of truth.
2.  **Section-by-Section Transcription:**
    *   **A: Races & Characters (pp. 15-23):** Verify all special abilities and rules for every race and strange character are listed.
    *   **B: Character Generation (pp. 24-27):** Fully transcribe every entry from the `Background`, `Motivation`, and `Class` tables.
    *   **C: Weapon Traits (p. 51):** Ensure every weapon trait is listed with its exact description.
    *   **D: Equipment (pp. 53-58):** Transcribe all items from the `Gun Mods`, `Gun Sights`, `Consumables`, `Protective Devices`, `Implants`, and `Utility Devices` lists.
3.  **Implementation Prediction:** For each transcribed rule, make an initial assessment of where the logic should be implemented (e.g., `services/rules/brawling.ts`, `services/traits/shooting.ts`, `components/ActionControls.tsx`). This will guide the audit in the next phase.
4.  **Review:** Perform a final pass to ensure the checklist is a 1:1 match with the rulebook text for all audited sections.

---

### Phase 2: Code Audit & Verification

With a complete checklist, we can begin the audit. This phase is focused on verifying the existing code.

1.  **Systematic Review:** Go through the `AUDIT_CHECKLIST.md` item by item.
2.  **Locate & Analyze:** For each rule, locate the corresponding code in the `services/`, `stores/`, or `components/` directories. Analyze the implementation and compare its behavior against the `Rule Description` in the checklist.
3.  **Test Coverage:** For each rule, check if a corresponding unit test exists in a relevant `.test.tsx` file. If not, this is a good opportunity to add one to lock in the correct behavior. Tests are critical for preventing regressions.
4.  **Update Status:** Update the `Status` column for each rule in the checklist:
    *   `[x]` **Complete:** The implementation is correct and verified.
    *   `[/]` **Partial / Bugged:** The implementation exists but is incorrect or incomplete. Add a note in the `Notes` column detailing the discrepancy.
    *   `[ ]` **To Do:** The rule is not implemented at all.
    *   `[?]` **Needs Verification:** The implementation is complex or its correctness is unclear and requires a deeper look or more specific testing.

---

### Phase 3: Remediation

This phase involves fixing the issues discovered during the audit.

1.  **Issue Triage:** Compile a list of all items marked as `[/]` or `[ ]` from the checklist.
2.  **Prioritization:** Prioritize the fixes based on impact. Core mechanics (e.g., combat traits, stat calculations) should be fixed before more specific item or character rules.
3.  **Implementation:** Address each issue by fixing the code or implementing the missing feature.
4.  **Final Verification:** After a fix is implemented, re-verify it against the checklist and update its status to `[x]`.

By following this structured plan, we can ensure a thorough and effective audit, resulting in a more robust and accurate gameplay experience.