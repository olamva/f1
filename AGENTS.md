# Parallel work

Treat a task as done only when its changes are in a pull request and merged into `main`.
For a change to `infra/`, also apply it with Terraform. Follow the Terraform section.
Do not wait for deployment after the merge. Settle the thread and clean up immediately.
If a required step is blocked, report the current status and the blocker. Do not report the task as done.

Use one branch and one worktree for each task.
Start each task in a new T3 thread and its worktree.
Import the `Setup Worktree` action from `t3.json` in T3 project settings once.
Let T3 run the action for new worktrees. It updates the new branch to `origin/main` and installs dependencies.
If T3 skips setup, run `git fetch origin main`, `git merge --ff-only origin/main`, and `CI=true pnpm install --frozen-lockfile` before edits.
Use the branch that T3 creates for the worktree. Rename it with `git branch -m` when needed. Do not create a second branch.
Create a new branch from the current `origin/main` only in a detached checkout.
Keep edits in the task worktree. Do not change another task's branch or worktree.
Coordinate changes to shared state with concurrent agents. Worktrees do not isolate this state:

- the main checkout at `~/Developer/f1` and its `.git` directory, including the stash
- the dev server ports `8787` and `5173`
- the Jolpica rate limit, which all local servers share
- the Terraform state, Azure resources, and GitHub settings and variables

Run `PORT=0 VITE_PORT=0 pnpm dev` in each worktree. The command then selects unused ports.
Point preview and Playwright checks at the Vite URL that the command prints.

## Pull requests

Create a pull request into `main` for each completed task. Do not merge a stack of pull requests.
Explain the change and report validation in the pull request description.
Run `pnpm format` before each commit. `pnpm test` fails on unformatted files.
Run relevant local checks before pushing. Use `pnpm test`, `pnpm typecheck`, and `pnpm build` when applicable.
Review the final diff. Resolve review feedback within the task scope.
Resolve each review thread. Unresolved threads block auto-merge.
Fetch `origin/main` before you push. Merge it into the task branch if the branch is behind.
Do not push when this merge fast-forwards the task branch. The PR is then already merged. Start cleanup instead.
Enable auto-merge on your own PR with `gh pr merge --auto --merge` immediately after you push.
Do not wait for user review before you merge a PR without visual changes.
Let GitHub merge the PR when the required checks pass.
Run `gh pr checks --watch --fail-fast` to wait. Then run `gh pr view --json state,mergeStateStatus`.
If a check fails, fix the failure and push the correction. Auto-merge stays enabled for the new head commit.
If the state is `BEHIND`, merge `origin/main` into the task branch, resolve conflicts, and push.
Do not force-push, bypass branch protection, or merge with blocked checks. Do not use `gh pr merge --admin`.

## Live timing

Test live timing changes with a recorded session. Follow `.claude/skills/live-replay/SKILL.md`.

## Visual review

Require explicit visual approval for changes beyond a minor correction.
Require approval for noticeable layout, navigation, typography, color, component styling, or responsive changes.
Treat an isolated correction that preserves the existing design as minor.
Require approval when the classification is unclear.
Use T3 preview tools first for web UI review and screenshots when they are available.
Call `mcp__t3_code__preview_snapshot` with `save: true`.
Embed each returned `screenshotPath` in the review message.
Copy other images to `~/.t3/userdata/attachments` before you embed them. T3 does not show images from `/tmp`.
For required review, capture the changed UI in the running app. Include the before and after states.
Show the screenshots to the user and ask for approval after the change is complete.
Do not enable auto-merge before the user approves the reviewed change.
Record the approval in the PR description. Treat a missing required approval as a blocker.
Request renewed approval if later changes materially alter the reviewed appearance.

## Deployment and cleanup

Keep deployment on `main` through the existing workflow. The workflow does not run Terraform.
Do not watch the deployment run. Start cleanup as soon as the PR state is `MERGED`.
Let GitHub delete the merged remote branch. Preserve thread history.
Stop every dev server and preview process that you started before the final response.
Create each temporary checkout, such as a visual review "before" state, with `git worktree add --detach` under `/tmp`.
Remove a temporary checkout with `git worktree remove <path>` after checking for local files.
After merge, run `pnpm worktree:cleanup . <pr-number> --branch-only --apply` in the task worktree.
This verifies the merged PR, detaches the checkout, and deletes the local task branch.
Keep the active T3 worktree and thread. Remove the worktree only after T3 stops.
Run `pnpm worktree:cleanup <path> <pr-number> --apply` from another checkout to remove an idle worktree.
Include the cleanup status in the final response.
Never force worktree removal. Preserve uncommitted files, ignored files that are not build output, and commits that are absent from `origin/main`.

## Terraform

Apply each merged change to `infra/` before you report the task as done. Do not ask for approval.
Apply after the cleanup detaches the task worktree. Do not apply from the main checkout.
Run `git fetch origin main` and `git checkout --detach origin/main` in the task worktree.
Run `terraform -chdir=infra init -input=false`.
Run `terraform -chdir=infra plan -input=false -var-file="$HOME/Developer/f1/infra/terraform.tfvars" -out=tfplan`.
Read the plan. Stop and report the plan if it destroys or replaces a resource that the task does not change.
Run `terraform -chdir=infra apply -input=false tfplan`. Then run `rm infra/tfplan`.
If the apply fails, run the plan and the apply again one time. If it fails again, report the error as a blocker.
Terraform locks the state during an apply. If another agent holds the lock, wait and try again.
Do not run `terraform destroy`, `terraform apply -destroy`, or `terraform force-unlock`.
Include the apply result in the final response.
