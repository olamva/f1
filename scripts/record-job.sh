#!/bin/zsh
set -u
NAME=$1
UNTIL=$2
LABEL=$3
REPO=${0:A:h:h}
OUT=${REPO:h}/recordings/$NAME.jsonl
FILE=recordings/$NAME.jsonl.gz
PUB=/tmp/f1-$NAME
TITLE="feat: add $NAME recording"
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
trap 'launchctl bootout "gui/$(id -u)/$LABEL"' EXIT
echo "start $(date -u +%FT%TZ)"
cd "$REPO" || exit 1
caffeinate -i node scripts/record.ts "$OUT" "$UNTIL" || exit 1
LINES=$(gunzip -c "$OUT.gz" | wc -l | tr -d ' ')
echo "recorded $LINES messages"
[ "$LINES" -gt 1000 ] || { echo "too few messages, not published"; exit 1; }
STATS=$(gunzip -c "$OUT.gz" | node -e 'let s="";process.stdin.on("data",(c)=>(s+=c)).on("end",()=>{const l=s.trim().split("\n").map(JSON.parse);const t0=l[0][0];const status=l.filter((x)=>x[1]==="SessionStatus").map((x)=>`${((x[0]-t0)/6e4).toFixed(1)} min ${x[2].Status}`);console.log(`- ${l.length} messages from ${new Date(t0).toISOString()} to ${new Date(l.at(-1)[0]).toISOString()}.`);console.log(`- ${l.filter((x)=>x[1]==="Position.z").length} Position.z messages.`);console.log(`- Session status: ${status.join(", ")}.`)})')
git fetch origin main || exit 1
git worktree add --detach "$PUB" origin/main || exit 1
mkdir -p "$PUB/recordings" && cp "$OUT.gz" "$PUB/$FILE" || exit 1
cd "$PUB" || exit 1
git switch -c "record/$NAME" && git add "$FILE" && git commit -q -m "$TITLE" && git push -u origin "record/$NAME" || exit 1
URL=$(gh pr create --base main --title "$TITLE" --body "## Change

Add the live timing recording \`$FILE\`. A launchd job from \`/record-session\` recorded it.

$STATS

Replay it with \`LIVE_REPLAY=$FILE pnpm dev\`. See the \`live-replay\` skill.

## Validation

The job checked that the file has more than 1000 messages. The PR changes no code.") || exit 1
echo "opened $URL"
gh pr merge "$URL" --auto --merge
cd "$REPO" && git worktree remove "$PUB"
echo "done $(date -u +%FT%TZ)"
