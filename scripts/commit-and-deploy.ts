import { spawnSync } from 'node:child_process';

const storedGitHubAuthEnvironment = { ...process.env };
delete storedGitHubAuthEnvironment.GH_TOKEN;
delete storedGitHubAuthEnvironment.GITHUB_TOKEN;

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env:
      command === 'git' || command === 'gh'
        ? storedGitHubAuthEnvironment
        : process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}`,
    );
  }
}

function capture(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env:
      command === 'git' || command === 'gh'
        ? storedGitHubAuthEnvironment
        : process.env,
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}`,
    );
  }
  return result.stdout.trim();
}

const branch = capture('git', ['branch', '--show-current']);
if (branch !== 'main') {
  throw new Error(
    `Deployment is restricted to the main branch; current branch is ${branch || '(detached)'}.`,
  );
}

const message =
  process.argv.slice(2).join(' ').trim() || 'chore: update course and deploy';

run('pnpm', ['verify']);
run('git', ['add', '--all']);

let createdCommit = false;
const staged = spawnSync('git', ['diff', '--cached', '--quiet'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});
if (staged.error) throw staged.error;
if (staged.status === 1) {
  run('git', ['commit', '-m', message]);
  createdCommit = true;
} else if (staged.status !== 0) {
  throw new Error(
    `git diff --cached --quiet failed with exit code ${staged.status}`,
  );
} else {
  process.stdout.write(
    'No changes to commit; pushing the current main branch.\n',
  );
}

run('gh', ['auth', 'status']);
const commit = capture('git', ['rev-parse', 'HEAD']);
const remoteBeforePush = capture('git', [
  'ls-remote',
  '--heads',
  'origin',
  'refs/heads/main',
]).split(/\s+/)[0];
const pushWillTriggerDeploy = remoteBeforePush !== commit;

run('git', ['push', 'origin', 'main']);

const remoteCommit = capture('git', [
  'ls-remote',
  '--heads',
  'origin',
  'refs/heads/main',
]).split(/\s+/)[0];
if (remoteCommit !== commit) {
  throw new Error(
    `Local HEAD ${commit} does not match the pushed origin/main ${remoteCommit || '(missing)'}.`,
  );
}

function findDeployRun(event: 'push' | 'workflow_dispatch'): string {
  return capture('gh', [
    'run',
    'list',
    '--workflow',
    'deploy.yml',
    '--branch',
    'main',
    '--commit',
    commit,
    '--event',
    event,
    '--limit',
    '1',
    '--json',
    'databaseId',
    '--jq',
    '.[0].databaseId // empty',
  ]);
}

const event =
  createdCommit || pushWillTriggerDeploy ? 'push' : 'workflow_dispatch';
let previousRun = '';
if (event === 'workflow_dispatch') {
  previousRun = findDeployRun(event);
  run('gh', ['workflow', 'run', 'deploy.yml', '--ref', 'main']);
}

let runId = '';
for (let attempt = 0; attempt < 30; attempt += 1) {
  runId = findDeployRun(event);
  if (runId && runId !== previousRun) break;
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}

if (!runId || runId === previousRun) {
  const repositoryUrl = capture('gh', [
    'repo',
    'view',
    '--json',
    'url',
    '--jq',
    '.url',
  ]);
  throw new Error(
    `The Pages workflow did not become visible within 60 seconds. Check ${repositoryUrl}/actions/workflows/deploy.yml`,
  );
}

run('gh', ['run', 'watch', runId, '--exit-status']);
const deploymentUrl = capture('gh', [
  'run',
  'view',
  runId,
  '--json',
  'url',
  '--jq',
  '.url',
]);
process.stdout.write(`Deployment completed: ${deploymentUrl}\n`);
