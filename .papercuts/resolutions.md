# Papercut resolutions

This review covers 62 existing reports and three reports from this task.

| IDs | Type | Fault and resolution |
| --- | --- | --- |
| `19248a02` | left open | Two-driver preview data. The report has no response fixture. The current source has no sample season route. |
| `1845fe06`, `02b87438`, `01e2100d` | avoided | Jolpica rate limits. Share the request queue, retry HTTP 429 twice, respect cooldowns, and preserve cached data. Start previews sequentially. |
| `177f7655`, `86ba3731`, `a2949cc8`, `7ecabdbd`, `0116e4e9`, `b000b9d6`, `8f20eda7`, `f3ba2a35`, `873db4a7`, `b50f6474` | skill | pnpm version resolution. Use network permission for the pinned package manager. Installation and checks succeed with pnpm 12.6.0. |
| `a8affb00`, `db673d63`, `31bc2624` | skill | Dependency installs and stores. Use network permission, one permission context, independent dependencies, and CI=true for installs without a terminal. |
| `52c5892b` | avoided | Install confirmation without a terminal. Set CI=true in the T3 setup action. |
| `875e9b84`, `713ea8ad`, `e2ab117b` | avoided | Watcher and local port restrictions. Use DEV_WATCH=0 to disable both watchers. Give local servers network permission. |
| `22f202ab` | skill | Rejected phone preset. Use freeform dimensions. The T3 preview accepts 393 by 852 pixels. |
| `9d5be96f`, `45620f69` | skill | SVG gradients and clipped icons. Use an SVG renderer for exact icon sizes. Keep permitted Chrome captures at least 500 pixels wide. |
| `ff38e2ce`, `68566b75`, `c312b4d1` | skill | JSON extraction and sandbox DNS. Use curl with network permission. Both reported public endpoints return valid JSON in this check. |
| `871e10fc`, `86ad993b` | fixed | Orphan dev processes. Stop both process groups after signals or a child exit. Tests verify watcher child cleanup. |
| `33ebb381`, `f1c9dd0d`, `d9b367b3`, `14b43bf9`, `da784a94`, `6f7225f9`, `f8a2a39d`, `8fb69242`, `ce9cb3fe`, `430614e5` | skill | Blocked Git metadata writes. Give Git metadata writes permission when the sandbox blocks the linked worktree metadata. |
| `9fab0933`, `5ab5275b` | skill | Blocked process inspection. Run process inspection with permission outside the sandbox. |
| `7bdb63d7` | project doc | Terraform worktree setup. Document storage-scope login and creation of ignored worktree variables without replacing existing values. |
| `cb95cd27`, `cb3b36fe` | project doc | T3 setup action import. Use the existing manual import instructions in README.md and AGENTS.md. Run the documented setup commands if needed. |
| `2beb342c` | skill | Navigation before server readiness. Wait for both server readiness messages. Use the printed Vite URL. |
| `31b9845a`, `f46ade4e`, `442ab4f8`, `60841b7b`, `ef07d28b`, `60a3009c`, `cf598f82`, `f4206fa7`, `e43c3865`, `8e7431dd`, `2532ab88` | left open | T3 snapshot failures. Capture fails again after reopening the same tab. The preview reports visible:false. Desktop recovery remains blocked. |
| `a222eaf4` | left open | T3 recording failure. The recording failure has no verified workaround. Screenshot capture also fails. |
| `2fbcb07b` | skill | CSS uppercase text waits. Match the DOM source text or a stable locator. CSS text transformation does not change text nodes. |
| `7bbaa55b` | left open | Preview host disconnect. The source belongs to T3. Reopening does not restore working capture in this session. |
| `7268905a` | skill | CI checks not registered. Inspect the current head and retry the watcher three times. Report missing checks instead of accepting them. |
| `ecd6311a` | fixed | Preview connects to another worktree. Reject occupied ports before startup. Assign both worktree ports and use the printed URL. |
| `32eb1f47` | skill | DOM changes differ between clients. Create review states through page controls or application fixtures. Keep all calls on one explicit tab. |
| `9080bd4a` | skill | Temporary image paths do not render. Embed T3 screenshot paths. Copy permitted fallback images into the T3 attachments directory. |
| `b19e309b` | skill | F1 JSON byte order mark. Decode downloaded JSON with utf-8-sig. The downloaded archive parses successfully. |
| `369aa862` | skill | Standalone TypeScript checks. Pass --ignoreConfig when TypeScript 7 checks explicit source files beside tsconfig.json. |

The personal tool-failures skill holds the reusable guidance.
Its existing symlinks expose the same source to Claude Code, Codex, and both Gemini skill paths.
The personal skill source sits outside this repository.
The review changes no global instruction file. All reports concern this repository or shared tools; the review skips none.

## Validation

- Pass all 45 tests, TypeScript checks, and the production build.
- Verify startup, the Vite API proxy, and shutdown on isolated ports.
- Verify the skill format and its four mirrors.
- Verify valid JSON responses from the Jolpica and F1 archive endpoints.
- Verify the freeform T3 viewport. Preserve failed capture reports.

## User actions

- Import the updated Setup Worktree action from t3.json in T3 project settings.
- Run az login --scope https://storage.azure.com/.default when Terraform storage authentication requests login.
- Fill placeholders only in the ignored infra/terraform.tfvars file for infrastructure work.
- Install librsvg with brew install librsvg if SVG export needs rsvg-convert.
- Show this thread preview on a desktop before a later capture recovery check.
- Preserve a response fixture if the two-driver season response occurs again.
