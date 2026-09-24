# Parallel work

Treat a task as done only when its changes are in a pull request and merged into `main`.
When deployment is necessary, verify that the deployment succeeds for the merged commit before reporting completion.
If a required step is blocked, report the current status and the blocker. Do not report the task as done.

Use one branch and one worktree for each task. Start new branches from the current `origin/main`.
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

## Deployment and cleanup

Keep deployment on `main` through the existing workflow.
Delete the merged remote branch. Preserve active T3 worktrees and thread history.
Run `git fetch --prune origin` after the merge.
Detach the task worktree with `git switch --detach origin/main`.
Delete the local task branch with `git branch -d <branch>`.
Remove a worktree only after its thread ends and its checkout is clean.
Preserve uncommitted files and commits that are absent from `origin/main`.
