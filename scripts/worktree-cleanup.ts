import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, sep } from "node:path";

const regenerable = [
  "node_modules/",
  "node_modules",
  "dist/",
  ".vite/",
  ".pnpm-store/",
  "infra/.terraform/",
];

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const [path, number, ...flags] = process.argv.slice(2);
if (
  !path ||
  !/^\d+$/.test(number ?? "") ||
  flags.some((flag) => !["--apply", "--branch-only"].includes(flag)) ||
  new Set(flags).size !== flags.length
)
  throw new Error(
    "Use pnpm worktree:cleanup <path> <pr-number> [--branch-only] [--apply].",
  );

const apply = flags.includes("--apply");
const branchOnly = flags.includes("--branch-only");
const cwd = process.cwd();
const target = realpathSync(path);
const main = realpathSync(
  dirname(git(cwd, "rev-parse", "--path-format=absolute", "--git-common-dir")),
);
if (target === main) throw new Error("Preserve the main checkout.");
const current = realpathSync(cwd);
if (!branchOnly && (current === target || current.startsWith(target + sep)))
  throw new Error("Run worktree removal from another checkout.");

git(cwd, "fetch", "--prune", "origin");
const pr = JSON.parse(
  execFileSync(
    "gh",
    [
      "pr",
      "view",
      number!,
      "--json",
      "state,baseRefName,headRefName,headRefOid,mergeCommit,url",
    ],
    { cwd, encoding: "utf8" },
  ),
) as {
  state: string;
  baseRefName: string;
  headRefName: string;
  headRefOid: string;
  mergeCommit: { oid: string } | null;
  url: string;
};
const entry = git(cwd, "worktree", "list", "--porcelain", "-z")
  .split("\0\0")
  .find((value) => value.split("\0")[0] === `worktree ${target}`);
if (
  !entry ||
  entry.split("\0").some((line) => /^(locked|prunable)( |$)/.test(line))
)
  throw new Error("The worktree is absent, locked, or prunable.");
const branch =
  entry
    .split("\0")
    .find((line) => line.startsWith("branch "))
    ?.slice("branch refs/heads/".length) ?? pr.headRefName;
const head = git(target, "rev-parse", "HEAD");
if (
  branch === "main" ||
  pr.state !== "MERGED" ||
  pr.baseRefName !== "main" ||
  pr.headRefName !== branch ||
  pr.headRefOid !== head ||
  !pr.mergeCommit
)
  throw new Error("The worktree does not match the merged PR.");
git(cwd, "merge-base", "--is-ancestor", head, "refs/remotes/origin/main");
git(
  cwd,
  "merge-base",
  "--is-ancestor",
  pr.mergeCommit.oid,
  "refs/remotes/origin/main",
);
if (git(target, "status", "--porcelain", "--untracked-files=all"))
  throw new Error("Preserve uncommitted or untracked files.");
if (git(cwd, "ls-remote", "--heads", "origin", `refs/heads/${branch}`))
  throw new Error("Wait for remote branch deletion.");
const local = git(cwd, "branch", "--list", branch);
if (local && git(cwd, "rev-parse", `refs/heads/${branch}`) !== head)
  throw new Error("Preserve the changed local branch.");

if (!branchOnly) {
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
  if (process.platform !== "darwin")
    throw new Error("Automatic activity checks require macOS.");
  const processes = execFileSync("ps", ["-axo", "args="], {
    encoding: "utf8",
  });
  if (/\/T3 Code[^/]*\.app\/|(?:^|[\s/])t3(?:code)?(?:\s|\/)/m.test(processes))
    throw new Error("Stop T3 before removing its worktree.");
  const files = spawnSync(
    "lsof",
    ["-n", "-a", "-u", String(process.getuid!()), "-d", "cwd", "-Fn"],
    { encoding: "utf8" },
  );
  if (files.error || files.status !== 0 || files.stderr.trim())
    throw new Error("Cannot verify process working directories.");
  if (
    files.stdout
      .split("\n")
      .some(
        (line) => line === `n${target}` || line.startsWith(`n${target}${sep}`),
      )
  )
    throw new Error("A process still uses the worktree.");
}

if (apply) {
  if (local) {
    git(target, "switch", "--detach", head);
    git(target, "branch", "-d", branch);
  }
  if (!branchOnly) git(main, "worktree", "remove", target);
}
console.log(
  JSON.stringify({
    target,
    branch,
    pullRequest: pr.url,
    removed: apply && !branchOnly,
    branchRemoved: apply && !!local,
  }),
);
