# Job Kanban Status And Handoff

## Purpose
This document reflects the current state of the standalone job application kanban app that now lives under `job-kanban/`.

It is no longer just a speculative build plan. It should help another agent quickly understand:

- what is already implemented
- what has been verified
- where the code lives
- what is still incomplete or risky
- what the next logical slices of work should be

## Current Status
As of 2026-03-28, the repo contains a working first-pass kanban app at `job-kanban/index.html` plus a basic Node-based logic test suite under `job-kanban/tests/`.

The app is separate from the resume builder and follows the intended local-first architecture:

- plain HTML, CSS, and JavaScript ES modules
- board state stored in `localStorage`
- JSON import and export
- no cookies
- no app-controlled backend
- explicit button-driven workflow actions instead of drag-and-drop

Initial implementation and documentation landed during the branch work that introduced the job kanban app.

## What Is Implemented

### App Shell
Implemented in:

- `job-kanban/index.html`
- `job-kanban/app.css`
- `job-kanban/js/app-shell.js`

Current shell includes:

- branded top bar
- `New application`, `Import JSON`, `Export JSON`, and `Privacy` actions
- fixed 4-column board layout on desktop
- stacked responsive layout on smaller screens
- privacy modal
- transient status messages

### Modules
The app follows the modular structure originally proposed:

- `app-shell`
- `board-store`
- `board-renderer`
- `card-actions`
- `modal-controller`
- `persistence`
- `dates`
- `validation`
- `schema`

Module files:

- `job-kanban/js/app-shell.js`
- `job-kanban/js/board-store.js`
- `job-kanban/js/board-renderer.js`
- `job-kanban/js/card-actions.js`
- `job-kanban/js/modal-controller.js`
- `job-kanban/js/persistence.js`
- `job-kanban/js/dates.js`
- `job-kanban/js/validation.js`
- `job-kanban/js/schema.js`

Current test files:

- `job-kanban/tests/board-store.test.js`
- `job-kanban/tests/validation.test.js`
- `job-kanban/tests/dates.test.js`

### Data Model
The persisted board state follows the planned shape:

- fixed `columnOrder`
- per-column `cardIds`
- `cardsById`
- no current-column field stored on cards

Implemented card features:

- company, role, job URL, location, notes
- structured backlog label
- structured fit assessment
- structured process steps
- applied date
- close reason, close note, closed date
- created and updated audit timestamps

Implemented process step features:

- stage
- status
- scheduled local date-time
- contact person
- notes
- created and updated timestamps

Current in-progress summary is derived from the latest step rather than stored separately.

### Workflow
The fixed column order is implemented as:

1. Backlog
2. Applied
3. In Progress
4. Closed

Newest-first insertion is implemented for:

- new cards
- cards moved between columns
- newly added process steps

Implemented card actions by column:

- `Backlog`: `Applied`, `Discard`, `See more`
- `Applied`: `Start Process`, `Close`, `See more`
- `In Progress`: `Add step`, `Close`, `See more`
- `Closed`: `Reopen`, `See more`

Implemented workflow behavior:

- new cards start in `Backlog`
- apply flow captures `appliedAt` and moves to `Applied`
- discard from `Backlog` uses restricted close reasons and moves to `Closed`
- start process or add step appends a step and moves to `In Progress`
- close from `Applied` or `In Progress` uses full close reasons and moves to `Closed`
- reopen moves the card to `Backlog` and clears only `closeReason`, `closeNote`, and `closedAt`
- permanent delete is only exposed from the details modal

### Modals
Implemented modal flows:

- create card
- card details
- edit basics
- edit fit
- apply card
- add step
- edit step
- discard / close
- delete confirmation

### Persistence
Implemented persistence behavior:

- one localStorage key: `job-kanban:draft`
- saves only on committed state mutations
- no autosave on every keystroke while editing
- export snapshot includes `app`, `schemaVersion`, `exportedAt`, and `data`
- import is replace-only and gated by confirmation

### Validation
Implemented validation currently checks:

- `app === "job-kanban"` when present
- exact supported `schemaVersion`
- required fixed column order
- required column objects and `cardIds`
- every referenced card exists
- duplicate card references are rejected
- enum values are normalized and validated
- date, date-time, and instant strings are validated

### Privacy Copy
Privacy copy exists in the app and currently states:

- board data is stored in the browser
- card data is not sent to an app-controlled server
- the app does not use cookies
- the app avoids unnecessary external requests
- hosting and browser metadata may still exist independently of card data

## What Has Been Verified
Verification completed so far:

- all `job-kanban/js/*.js` modules passed `node --experimental-default-type=module --check`
- all `job-kanban/tests/*.js` files passed `node --experimental-default-type=module --check`
- `node --test --experimental-default-type=module job-kanban/tests/*.test.js` passed
- the logic test suite currently covers:
  - `board-store.js` state transitions for create, apply, close, reopen, add/edit step, and delete
  - `validation.js` normalization and rejection paths for valid and invalid import payloads
  - `dates.js` plain date, date-time, and instant validation helpers
- local served route `http://127.0.0.1:8000/job-kanban/` returned `200 OK`
- key asset paths returned `200 OK`:
  - `/job-kanban/app.css`
  - `/job-kanban/js/app-shell.js`
  - `/css/fonts.css`
  - `/css/foundation.css`

What has not been fully verified yet:

- manual browser walkthrough of every modal flow
- keyboard-only interaction pass
- screen reader pass
- malformed import edge cases beyond the current logic test cases
- persistence behavior across multiple real page reload cycles in a browser session

## Known Gaps And Risks
The app is functional, but this is still an MVP. The next agent should treat these as active follow-up areas:

- Test coverage is still limited to pure logic and does not exercise browser UI behavior.
- Accessibility has not received a dedicated refinement pass.
- There is no drag-and-drop or manual reordering.
- There are no filters, search, tags, reminders, or analytics views.
- Browser-level runtime behavior has only been checked indirectly so far, not exhaustively exercised.
- Import/export compatibility has one supported schema version only.
- Error presentation is lightweight and modal-local; there is no broader recovery UI.

## Recommended Next Work
Another agent should not rebuild the foundation. The next best work is incremental refinement on top of the current implementation.

### Priority 1: Manual QA And Bug Fixing
Do a real browser pass through every flow:

- create card
- edit basics
- edit fit
- apply
- discard
- start process
- add step
- edit step
- close
- reopen
- delete
- export and re-import
- reload and confirm persistence

Focus on:

- modal transitions
- state consistency after multi-step edits
- date and date-time form handling
- import replacement behavior
- visual behavior on mobile widths

### Priority 2: Accessibility Refinement
Recommended follow-up work:

- improve dialog labelling and focus placement
- confirm escape and backdrop behavior
- audit button labels and accessible names
- add clearer empty-state and error semantics
- test keyboard traversal through board cards and modal actions

### Priority 3: Test Coverage
Basic lightweight tests now exist around pure logic:

- `validation.js`
- `board-store.js`
- `dates.js`

Currently covered scenarios:

- create inserts at the top of `Backlog`
- apply moves to `Applied`
- close and reopen preserve the expected fields
- add/edit step behavior preserves history correctly
- delete removes both card record and column reference
- valid import payloads normalize successfully
- invalid payloads are rejected cleanly

Good next additions:

- expand validation coverage for more malformed import payload shapes
- add focused tests for persistence helpers
- add browser-level smoke coverage once a lightweight harness is chosen

### Priority 4: UX Polish
Once QA is stable:

- improve visual hierarchy inside the details modal
- polish feedback states for import and destructive actions
- refine mobile spacing and overflow handling
- consider subtle card status highlighting by column

### Deferred Features
These remain intentionally deferred:

- drag-and-drop
- manual card ordering
- filters
- search
- analytics
- reminders
- tags
- richer schema migrations

## Suggested Handoff Reading Order
If another agent picks this up, read in this order:

1. `job-kanban/index.html`
2. `job-kanban/js/app-shell.js`
3. `job-kanban/js/board-store.js`
4. `job-kanban/js/modal-controller.js`
5. `job-kanban/js/validation.js`
6. `job-kanban/js/board-renderer.js`
7. `job-kanban/app.css`

That order gives the fastest route from app entry point to state transitions to UI behavior.

## Useful Working Notes

- The app is intended to remain standalone and should not be folded into the resume builder.
- Existing untracked directories like `.local/` and `docs/` were user-owned and should be treated carefully.
- Continue making small logical commits rather than batching unrelated changes together.
- Prefer building on the current modules instead of collapsing them into one large file.
- Rerun the current logic suite with `node --test --experimental-default-type=module job-kanban/tests/*.test.js`.

## Definition Of Done For The Next Agent
The next meaningful milestone should be:

- all current modal flows manually exercised in a real browser
- any bugs from that pass fixed
- the current logic tests kept green while browser and accessibility fixes land
- accessibility issues reduced enough that keyboard usage feels intentional rather than incidental
