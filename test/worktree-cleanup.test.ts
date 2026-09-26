import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("cleanup keeps an active merged worktree and removes its branch", () => {
  const root = mkdtempSync(join(tmpdir(), "f1-worktree-cleanup-"));
  const remote = join(root, "remote.git");
  const main = join(root, "main");
  const task = join(root, "task");
  const bin = join(root, "bin");
  const script = resolve("scripts/worktree-cleanup.ts");
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();

  try {
    execFileSync("git", ["init", "--bare", "--initial-branch=main", remote]);
    execFileSync("git", ["clone", remote, main]);
    git(main, "config", "user.name", "Test");
    git(main, "config", "user.email", "test@example.com");
    writeFileSync(join(main, "file.txt"), "base\n");
    git(main, "add", "file.txt");
    git(main, "commit", "-m", "base");
    git(main, "push", "-u", "origin", "main");
    git(main, "worktree", "add", "-b", "task", task);
    git(task, "config", "user.name", "Test");
    git(task, "config", "user.email", "test@example.com");
    writeFileSync(join(task, "file.txt"), "task\n");
    git(task, "commit", "-am", "task");
    const head = git(task, "rev-parse", "HEAD");
    git(task, "push", "-u", "origin", "task");
    git(main, "merge", "--no-ff", "-m", "merge task", "task");
    const merge = git(main, "rev-parse", "HEAD");
    git(main, "push", "origin", "main");
    git(main, "push", "origin", "--delete", "task");

    mkdirSync(bin);
    const gh = join(bin, "gh");
    writeFileSync(gh, '#!/bin/sh\nprintf "%s" "$MOCK_PR"\n');
    chmodSync(gh, 0o755);
    const run = (state: string, ...args: string[]) =>
      spawnSync(process.execPath, [script, task, "1", ...args], {
        cwd: task,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          MOCK_PR: JSON.stringify({
            state,
            baseRefName: "main",
            headRefName: "task",
            headRefOid: head,
            mergeCommit: { oid: merge },
            url: "https://example.com/pr/1",
          }),
        },
      });

    assert.match(run("MERGED", "--apply").stderr, /another checkout/);
    assert.match(run("OPEN", "--branch-only", "--apply").stderr, /merged PR/);
    const result = run("MERGED", "--branch-only", "--apply");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).branchRemoved, true);
    assert.equal(git(task, "rev-parse", "HEAD"), head);
    assert.equal(git(task, "branch", "--show-current"), "");
    assert.equal(git(main, "branch", "--list", "task"), "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
