---
name: click-path-audit
description: "Trace every user-facing button/touchpoint through its full state change sequence to find bugs where functions individually work but cancel each other out, produce wrong final state, or leave the UI in an inconsistent state. Use when: systematic debugging found no bugs but users report broken buttons, or after any major refactor touching shared state stores."
origin: community
---

# /click-path-audit - Behavioural Flow Audit

Find bugs that static code reading misses: state interaction side effects, race conditions between sequential calls, and handlers that silently undo each other.

## The Problem This Solves

Traditional debugging checks:
- Does the function exist? (missing wiring)
- Does it crash? (runtime errors)
- Does it return the right type? (data flow)

But it does NOT check:
- **Does the final UI state match what the button label promises?**
- **Does function B silently undo what function A just did?**
- **Does shared state (Zustand/Redux/context) have side effects that cancel the intended action?**

This pattern shows up when two handlers touch the same shared state store: each call works in isolation, but a later call's side effect silently resets a field an earlier call just set, so the button appears to do nothing even though every function ran without error.

---

## How It Works

For EVERY interactive touchpoint in the target area:

```
1. IDENTIFY the handler (onClick, onSubmit, onChange, etc.)
2. TRACE every function call in the handler, IN ORDER
3. For EACH function call:
   a. What state does it READ?
   b. What state does it WRITE?
   c. Does it have SIDE EFFECTS on shared state?
   d. Does it reset/clear any state as a side effect?
4. CHECK: Does any later call UNDO a state change from an earlier call?
5. CHECK: Is the FINAL state what the user expects from the button label?
6. CHECK: Are there race conditions (async calls that resolve in wrong order)?
```

---

## Execution Steps

### Step 1: Map State Stores

Before auditing any touchpoint, build a side-effect map of every state store action:

```
For each Zustand store / React context in scope:
  For each action/setter:
 - What fields does it set?
 - Does it RESET other fields as a side effect?
 - Document: actionName → {sets: [...], resets: [...]}
```

This is the critical reference. The "New Email" bug was invisible without knowing that `selectThread` resets `composeMode`.

**Output format:**
```
STORE: emailStore
  setComposeMode(bool) → sets: {composeMode}
  selectThread(thread|null) → sets: {selectedThread, selectedThreadId, messages, drafts, selectedDraft, summary} RESETS: {composeMode: false, composeData: null, redraftOpen: false}
  setDraftGenerating(bool) → sets: {draftGenerating}
  ...

DANGEROUS RESETS (actions that clear state they don't own):
  selectThread → resets composeMode (owned by setComposeMode)
  reset → resets everything
```

### Step 2: Audit Each Touchpoint

For each button/toggle/form submit in the target area:

```
TOUCHPOINT: [Button label] in [Component:line]
  HANDLER: onClick → {
    call 1: functionA() → sets {X: true}
    call 2: functionB() → sets {Y: null} RESETS {X: false}  ← CONFLICT
  }
  EXPECTED: User sees [description of what button label promises]
  ACTUAL: X is false because functionB reset it
  VERDICT: BUG - [description]
```

**Check each of these bug patterns:**

#### Pattern 1: Sequential Undo
```
handler() {
  setState_A(true)     // sets X = true
  setState_B(null)     // side effect: resets X = false
}
// Result: X is false. First call was pointless.
```

#### Pattern 2: Async Race
```
handler() {
  fetchA().then(() => setState({ loading: false }))
  fetchB().then(() => setState({ loading: true }))
}
// Result: final loading state depends on which resolves first
```

#### Pattern 3: Stale Closure
```
const [count, setCount] = useState(0)
const handler = useCallback(() => {
  setCount(count + 1)  // captures stale count
  setCount(count + 1)  // same stale count - increments by 1, not 2
}, [count])
```

#### Pattern 4: Missing State Transition
```
// Button says "Save" but handler only validates, never actually saves
// Button says "Delete" but handler sets a flag without calling the API
// Button says "Send" but the API endpoint is removed/broken
```

#### Pattern 5: Conditional Dead Path
```
handler() {
  if (someState) {        // someState is ALWAYS false at this point
    doTheActualThing()    // never reached
  }
}
```

#### Pattern 6: useEffect Interference
```
// Button sets stateX = true
// A useEffect watches stateX and resets it to false
// User sees nothing happen
```

### Step 3: Report

For each bug found:

```
CLICK-PATH-NNN: [severity: CRITICAL/HIGH/MEDIUM/LOW]
  Touchpoint: [Button label] in [file:line]
  Pattern: [Sequential Undo / Async Race / Stale Closure / Missing Transition / Dead Path / useEffect Interference]
  Handler: [function name or inline]
  Trace:
    1. [call] → sets {field: value}
    2. [call] → RESETS {field: value}  ← CONFLICT
  Expected: [what user expects]
  Actual: [what actually happens]
  Fix: [specific fix]
```

---

## Scope Control

This audit is expensive. Scope it appropriately:

- **Full app audit:** Use when launching or after major refactor. Launch parallel agents per page.
- **Single page audit:** Use after building a new page or after a user reports a broken button.
- **Store-focused audit:** Use after modifying a Zustand store - audit all consumers of the changed actions.

### Recommended agent split for full app:

```
Agent 1: Map ALL state stores (Step 1) - this is shared context for all other agents
Agent 2: Dashboard (Tasks, Notes, Journal, Ideas)
Agent 3: Chat (ChatColumn, ChatPage)
Agent 4: Emails (ThreadList, DraftArea, OverviewTab)
Agent 5: Projects (ProjectWizard, ProjectOverviewTab)
Agent 6: CRM (all sub-tabs)
Agent 7: Profile, Settings, Vault, Notifications
Agent 8: AdminSuite (all pages)
```

Agent 1 MUST complete first. Its output is input for all other agents.

---

## When to Use

- After systematic debugging finds "no bugs" but users report broken UI
- After modifying any Zustand store action (check all callers)
- After any refactor that touches shared state
- Before release, on critical user flows
- When a button "does nothing" - this is THE tool for that

## When NOT to Use

- For API-level bugs (wrong response shape, missing endpoint) - use systematic-debugging
- For styling/layout issues - visual inspection
- For performance issues - profiling tools

---

## Integration with Other Skills

- Run AFTER your debugging skill (which finds the other bug types)
- Run BEFORE your verification skill (which verifies fixes work)
- Feeds into your TDD skill - every bug found here should get a test

---
