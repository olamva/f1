# Parallel work

Treat a task as done only when its changes are in a pull request and merged into `main`.
When deployment is necessary, verify that the deployment succeeds for the merged commit before reporting completion.
If a required step is blocked, report the current status and the blocker. Do not report the task as done.

Use one branch and one worktree for each task.
Use the branch that T3 creates for the worktree. Rename it with `git branch -m` when needed. Do not create a second branch.
Create a new branch from the current `origin/main` only in a detached checkout.
Keep edits in the task worktree. Do not change another task's branch or worktree.
Coordinate changes to shared local paths, Azure resources, and GitHub settings with concurrent agents.

## Pull requests

Create a pull request into `main` for each completed task. Do not merge a stack of pull requests.
Explain the change and report validation in the pull request description.
Run relevant local checks before pushing. Use `pnpm test`, `pnpm typecheck`, and `pnpm build` when applicable.
Review the final diff. Resolve review feedback within the task scope.
Wait for every expected PR check to pass. Treat missing, pending, skipped, cancelled, or failed checks as blockers.
Fix failures and push the correction. Check the new head commit again.
Fetch `origin/main` before merging. Merge it into the task branch if the branch is behind.
Resolve conflicts and rerun checks for the new head commit.
Verify the PR head and checks immediately before merging.
Merge your own PR when checks pass and required reviews finish. Use a merge commit.
Do not force-push, bypass branch protection, or merge with blocked checks.

## Visual review

Apply a required visual review to each PR that changes the visible UI.
Use T3 preview tools first for web UI review and screenshots when they are available.
Call `mcp__t3_code__preview_snapshot` with `save: true`.
Embed each returned `screenshotPath` in the review message.
Take screenshots of the changed UI in the running app. Include the before and after states.
Show the screenshots to the user and ask for a review.
Do not merge the PR before the user approves the visual change.
Record the approval in the PR description.
Treat a missing visual approval as a blocker.

## Deployment and cleanup

Keep deployment on `main` through the existing workflow.
Delete the merged remote branch. Preserve thread history.
Stop every dev server and preview process that you started before the final response.
Create each temporary checkout, such as a visual review "before" state, with `git worktree add --detach` under `/tmp`.
Remove it with `pnpm worktree:cleanup <path> --apply` before the final response.
After the merge, run `pnpm worktree:cleanup . --apply` in the task worktree.
This prunes remote references, verifies the merge, deletes the local task branch, and removes the worktree.
Include the cleanup status in the final response.
Never force worktree removal. Preserve uncommitted files, ignored files that are not build output, and commits that are absent from `origin/main`.
