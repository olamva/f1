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

## Review of 9 October 2026

This review covers 70 open reports.

| IDs | Type | Fault and resolution |
| --- | --- | --- |
| `175ec0b6`, `8ac1ba85` | fixed | Port collisions. The dev command probes each port on 127.0.0.1 and on all interfaces. `PORT=0 VITE_PORT=0` selects unused ports. A test covers a port held on all interfaces. |
| `98c3bbab` | fixed | Cleanup of a renamed worktree branch. The cleanup command compares the PR head commit, not the branch name. It waits for deletion of the PR head branch. |
| `b4e1012a`, `aafe6d1b`, `ec5c0e64` | fixed | Missing recordings. Commit `0deef98` adds the Bahrain FP3 recording. |
| `45efec51` | fixed | Usage lines missing. Commit `72c11b0` reads usage with `CLAUDE_CONFIG_DIR`. |
| `380c4036` | avoided | Crashed server watcher. The README gives the restart command `touch src/server/main.ts`. |
| `83d9e4f7` | avoided | Empty wake job logs. The README gives the follow command for a running job. |
| `0cca9bbc` | avoided | UnityPy install. The README gives the venv command for `scripts/circuits.py`. |
| `3c6af6b4`, `0e239cd4`, `68acb46c` | skill | Race data in practice recordings. The live replay skill points to the archive replay for race and qualifying data. |
| `96c7df84` | project doc | Push after auto-merge. Do not push when the merge of `origin/main` fast-forwards the task branch. |
| `2ced3eca`, `4a6772aa`, `260f3105`, `7f6bc4e4`, `c0519860`, `463e020b`, `ad813406`, `998c5877`, `aefd3375`, `ea50a557`, `7ce38eee`, `c0a59097`, `0222b7d2`, `eccd8197`, `d18ca6a3`, `abc144aa`, `7019ee31`, `857af440` | skill | T3 snapshot failures. Capture works in this review. The skill adds the Playwright fallback and its browser install. |
| `5eb98b8d`, `d30f5c2e`, `afa9f70d`, `e8f2f7d7`, `f6163bdf`, `f6087455`, `fed58d1a`, `9b79bbb5`, `d485a376`, `7c1efa80`, `028f6917`, `471ac2fa` | skill | T3 host disconnects and waits. A 6 s evaluation and the Stats page work in this review. The skill keeps evaluations short and confirms waits. |
| `da0ad893`, `babf82dc`, `a61088d8`, `4fcc9d39` | skill | Low-resolution captures. T3 saves one image pixel for each CSS pixel. The skill adds a 2x Playwright capture. |
| `cf96222a`, `59ddd49c` | skill | Real full screen shrinks the T3 viewport to 400 by 300 pixels. The skill turns off `fullscreenEnabled` to use the CSS fallback. |
| `1195aac7`, `57aec522`, `9b3ddde3` | skill | Hidden preview tab. The skill checks `document.visibilityState` before timing animation or media. |
| `600b6413`, `f105d5f1`, `fc457b3d`, `94887e38`, `70afd534`, `97e5418e`, `88a80e54` | skill | gh output, pnpm flags, and network retries. The skill already holds these workarounds. |
| `db0b638f`, `8b54ab1b` | skill | Azure Cost Management 429 and rounded NOK prices. |
| `9f3208fb`, `e166a588`, `19a5bdf6`, `27133d76`, `ac7cee8c`, `f84971ed` | skill | Missing Python tools, the Docker daemon, `pkill`, Chrome debug ports, and zsh modifiers. |
| `19248a02` | left open | Two-driver season data. The fault does not occur, and the report has no fixture. |
| `34cbc34b` | left open | 2025 race control AccessDenied. All 60 race and qualifying streams of 2025 return HTTP 200 in this review. |

The personal tool-failures skill holds the new tool workarounds. Its symlinks expose it to Claude Code, Codex, and Gemini.
The review changes no global instruction file.
