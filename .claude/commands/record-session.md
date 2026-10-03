---
description: Schedule a launchd job that records the next F1 session, or a specified session, outside the T3 worktrees
argument-hint: '[session, for example "Abu Dhabi Race" or "next quali"]'
---

Schedule a recording of this F1 session: $ARGUMENTS

Record the next session that has not ended if the argument is empty.

The job must not depend on a T3 worktree, a T3 thread, or this agent. Use the recorder directory `~/Library/Application Support/f1-recorder`. It holds `checkout/`, a detached git worktree of the main checkout, and `recordings/`, the finished files. Do not put the recorder in `~/.t3` or `/tmp`.

## 1. Choose the session

1. Run `git fetch origin main`.
2. Read `git show origin/main:infra/sessions.json`. Each entry has `title`, and `at`, `start`, and `end` in epoch milliseconds.
3. Select the entry that matches the argument and has `end` in the future. Ask the user if more than one entry matches.
4. Tell the user and stop if no entry matches.
5. Set `NAME` to `<year>-<event>-<session>`:
   - `<event>` is the race name without "Grand Prix", in lowercase ASCII, with hyphens for spaces. Examples: `bahrain`, `abu-dhabi`, `sao-paulo`.
   - `<session>` is `fp1`, `fp2`, `fp3`, `sprint-quali`, `sprint`, `quali`, or `race`.
6. Set `START` to `at` minus 20 minutes. Set `UNTIL` to `end` minus 90 minutes, in ISO format. This is 30 minutes after the scheduled end.
7. Stop if `recordings/$NAME.jsonl.gz` is on `origin/main`, or if `~/Library/LaunchAgents/no.ola-vassbotn.f1.record.$NAME.plist` exists. Tell the user.

## 2. Prepare the recorder checkout

Run `pgrep -f scripts/record-job.sh`. Do not change the checkout while a job runs. Skip to step 3 if a job runs.

If `checkout/` does not exist, run `git worktree add --detach "$HOME/Library/Application Support/f1-recorder/checkout" origin/main` from this worktree.

If `checkout/` exists, run `git checkout --detach origin/main` in it. An untracked file in `checkout/recordings/` can block the checkout. Delete it only if its `git hash-object` matches the file on `origin/main`. Stop and tell the user if the checkout has other local changes.

Run `CI=true pnpm install --frozen-lockfile` in the checkout.

## 3. Check the car position token

Find the Key Vault name with `az keyvault list --query "[?starts_with(name, 'f1-vault')].name" -o tsv`. Set it as `VAULT`.

Run this command in the checkout. It prints only `true` or `false`:

```sh
KEY_VAULT_NAME=$VAULT node -e 'const t=await import("./src/server/token.ts");await t.load();console.log(t.keys().some((k)=>t.current(k)))'
```

If it prints `false`, or `az` fails, tell the user that the recording will have no car positions. Continue.

## 4. Write and load the launchd job

Set `LABEL` to `no.ola-vassbotn.f1.record.$NAME`. Set `DIR` to the absolute recorder path.

Write `~/Library/LaunchAgents/$LABEL.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>LABEL</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>KEY_VAULT_NAME</key><string>VAULT</string>
  </dict>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>DIR/checkout/scripts/record-job.sh</string>
    <string>NAME</string>
    <string>UNTIL</string>
    <string>LABEL</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Month</key><integer>MONTH</integer>
    <key>Day</key><integer>DAY</integer>
    <key>Hour</key><integer>HOUR</integer>
    <key>Minute</key><integer>MINUTE</integer>
  </dict>
  <key>StandardOutPath</key><string>DIR/NAME.log</string>
  <key>StandardErrorPath</key><string>DIR/NAME.log</string>
</dict>
</plist>
```

- Replace each placeholder. `MONTH`, `DAY`, `HOUR`, and `MINUTE` are `START` in local time. Use `date -r <seconds> '+%-m %-d %-H %-M'`.
- If `START` is in the past, replace `StartCalendarInterval` and its `dict` with `<key>RunAtLoad</key><true/>`.
- Run `plutil -lint` on the file.
- Run `launchctl bootstrap gui/$(id -u) <plist>`.
- Run `launchctl print gui/$(id -u)/$LABEL` and confirm that the job is loaded.

`scripts/record-job.sh` removes the plist and records the session. Then it opens a pull request with the file and enables auto-merge. It unloads the job at the end.

## 5. Report

Tell the user:

- the session, `NAME`, the local start time, and `UNTIL` in local time
- whether the recording will have car positions
- the log file `DIR/NAME.log` and the output file `DIR/recordings/NAME.jsonl.gz`
- that the Mac must be awake at the start time. `caffeinate` keeps it awake during the recording. launchd starts a missed job after the Mac wakes.
- that the T3 worktree and thread can now be removed
- that the job opens a pull request with auto-merge after the recording
- to cancel, run `launchctl bootout gui/$(id -u)/$LABEL` and delete the plist
