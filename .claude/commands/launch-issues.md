---
description: Launch one T3 thread for each of a number of open GitHub issues, and split them between the Claude accounts by their remaining usage
argument-hint: "<number of issues> [issue numbers]"
---

Launch T3 threads for open GitHub issues: $ARGUMENTS

The first argument is the number of issues. Other arguments are issue numbers to use first. Ask the user for the number if the argument is empty.

## 1. Check this thread

Read this thread with `t3_thread_configuration`. `t3_thread_launch` requires `runtimeMode` `full-access` and `interactionMode` `default`. If this thread has other modes, tell the user to switch to Full access, and stop.

## 2. Find the Claude accounts

Call `orchestrator_capabilities`. Use each provider with `driverKind` `claudeAgent` and `canRunChildTask` true. Use the model of this thread for all launches.

Get the config directory of each account:

```sh
jq -c 'paths(type == "object" and .driver == "claudeAgent") as $p | {id: $p[-1], homePath: getpath($p).config.homePath}' ~/.t3/userdata/settings.json
```

## 3. Read the remaining usage

Run this command for each account. Omit `CLAUDE_CONFIG_DIR=` if `homePath` is null or empty. Expand `~` in `homePath`. Do not set `HOME`. macOS then cannot find the keychain.

```sh
cd /tmp && CLAUDE_CONFIG_DIR=<homePath> claude -p /usage
```

Read two lines from the output:

- `Current session: <S>% used · resets <time>`
- `Current week (all models): <W>% used · resets <time>`

Calculate the headroom of each account:

1. Set `session` to `100 - S`. Set `session` to 100 if the session resets in less than 60 minutes.
2. Set `week` to `100 - W`.
3. Set `headroom` to the smaller of `session` and `week`.

Do not use an account with a headroom less than 10. If the command fails for an account, ask the user for its usage.

## 4. Count the current load

Call `t3_thread_list` with the statuses `preparing`, `queued`, `starting`, `running`, and `waiting`. Ignore this thread. Read the effort of each thread with `t3_thread_configuration`.

Give each effort a weight: `medium` 1, `high` 2, `xhigh` 3, `max` 4. The `load` of an account is half the sum of the weights of its threads. A running thread has already used part of its usage.

## 5. Choose the issues

Run `gh issue list --state open --limit 200 --json number,title,labels,createdAt`.

Do not use an issue if one of these is true:

- An unsettled thread has a title that starts with `#<number> `. Use `t3_thread_list` with `settled` false.
- `git ls-remote --heads origin t3code/issue-<number>` prints a branch.
- The issue has the label `low priority`, `wontfix`, `duplicate`, `invalid`, or `question`. Use a `low priority` issue only if the user names it.

Use the issues from the arguments first. Then prefer issues with the label `bug`. Then prefer the oldest issues.

Read each candidate with `gh issue view <number>`. Search `src/` for the files that each issue will probably change. Do not choose two issues that change the same file or the same feature. Do not choose an issue that changes a file that a running thread changes. Get the scope of a running thread from its title and its issue.

Launch fewer issues if not enough issues fit, and tell the user why. If an overlap is necessary, tell each of the two threads about the other thread in its message.

## 6. Choose the effort

- `xhigh`: the change touches the server and the client, a protocol, a cache, concurrency, or a large UI.
- `high`: all other issues.
- `medium`: only a text change or a change of one or two lines.

## 7. Split the issues

Sort the issues by weight, the largest first. Give each issue to the account with the smallest value of `(load + weight) / headroom`. Add the weight to the `load` of that account.

## 8. Launch the threads

Call `t3_thread_launch` once for each issue. The call has no retry key. If a call fails, run `t3_thread_list` before you try again.

```json
{
  "title": "#305 Improve the team radio panel",
  "workspaceStrategy": {
    "type": "worktree",
    "baseRef": "main",
    "branch": "t3code/issue-305",
    "startFromOrigin": true
  },
  "modelSelection": {
    "instanceId": "claude-2",
    "model": "claude-opus-5-5",
    "options": [{ "id": "effort", "value": "high" }]
  },
  "message": "Resolve GitHub issue #305. Read it with `gh issue view 305`. Follow AGENTS.md. Put `Closes #305` in the PR description."
}
```

Launch the first thread alone. Confirm that the response shows the correct account and effort. Then launch the other threads.

## 9. Report

Show a table with the issue, the title, the account, and the effort. For each account, show `S`, `W`, the headroom, and the load before and after the launch. Name the issues that you did not use because of an overlap.
