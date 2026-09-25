import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, sep } from "node:path";

const regenerable = [
  "node_modules/",
  "node_modules",
  "dist/",
  ".pnpm-store/",
  "infra/.terraform/",
];

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const [path, ...flags] = process.argv.slice(2);
if (!path || flags.some((flag) => flag !== "--apply"))
  throw new Error("Use pnpm worktree:cleanup <path> [--apply].");
const apply = flags.includes("--apply");

const cwd = process.cwd();
const target = realpathSync(path);
const main = realpathSync(
  dirname(git(cwd, "rev-parse", "--path-format=absolute", "--git-common-dir")),
);
if (target === main) throw new Error("Preserve the main checkout.");
const current = realpathSync(cwd);
const self = current === target || current.startsWith(target + sep);

git(cwd, "fetch", "--prune", "origin");
const branch = git(target, "branch", "--show-current");
if (branch === "main") throw new Error("Preserve the main branch.");
git(target, "merge-base", "--is-ancestor", "HEAD", "refs/remotes/origin/main");
if (git(target, "status", "--porcelain", "--untracked-files=all"))
  throw new Error("Preserve uncommitted or untracked files.");
if (
  branch &&
  git(cwd, "ls-remote", "--heads", "origin", `refs/heads/${branch}`)
)
  throw new Error(`Delete the merged remote branch ${branch} first.`);

const kept = git(
  target,
  "ls-files",
  "--others",
  "--ignored",
  "--exclude-standard",
  "--directory",
)
  .split("\n")
  .filter((name) => name && !regenerable.includes(name));
if (kept.length)
  throw new Error(`Preserve the ignored paths: ${kept.join(", ")}`);

const users = execFileSync(
  "lsof",
  ["-n", "-a", "-u", String(process.getuid!()), "-d", "cwd", "-Fpn"],
  {
    encoding: "utf8",
  },
)
  .split("\n")
  .reduce<{ pid: string; pids: string[] }>(
    (state, line) =>
      line.startsWith("p")
        ? { ...state, pid: line.slice(1) }
        : line === `n${target}` || line.startsWith(`n${target}${sep}`)
          ? { ...state, pids: [...state.pids, state.pid] }
          : state,
    { pid: "", pids: [] },
  ).pids;
if (!self && users.length)
  throw new Error(
    `Stop the processes that use the worktree: ${users.join(", ")}`,
  );

if (apply) {
  if (branch) {
    git(target, "switch", "--detach");
    git(target, "branch", "-d", branch);
  }
  git(main, "worktree", "remove", target);
}
console.log(
  JSON.stringify({
    target,
    branch,
    removed: apply,
    branchRemoved: apply && !!branch,
  }),
);
