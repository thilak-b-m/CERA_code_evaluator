import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_DIAGNOSTIC_BYTES = 16 * 1024;
const CLEANUP_TIMEOUT_MS = 5000;
const SANDBOX_OPTIONS = [
  '--network=none',
  '--memory=128m',
  '--memory-swap=128m',
  '--cpus=0.5',
  '--pids-limit=64',
  '--read-only',
  '--tmpfs=/tmp:rw,exec,nosuid,size=32m,mode=1777',
  '--user=65534:65534',
  '--cap-drop=ALL',
  '--security-opt=no-new-privileges:true',
  '--ulimit=nofile=64:64',
];

const RUNTIMES = {
  python: {
    image: 'python:3.12-alpine',
    filename: 'main.py',
    command: ['python', '/code/main.py'],
  },
  javascript: {
    image: 'node:22-alpine',
    filename: 'main.js',
    command: ['node', '/code/main.js'],
  },
  java: {
    image: 'eclipse-temurin:21-jdk',
    filename: 'Main.java',
    command: ['sh', '-c', 'javac -d /tmp /code/Main.java && java -cp /tmp Main'],
  },
  cpp: {
    image: 'gcc:14',
    filename: 'main.cpp',
    command: ['sh', '-c', 'g++ -std=c++17 -O2 -pipe -o /tmp/main /code/main.cpp && /tmp/main'],
  },
};

export class ExecutionUnavailableError extends Error {
  constructor(message = 'The isolated execution worker is unavailable. No code was executed.') {
    super(message);
    this.name = 'ExecutionUnavailableError';
    this.statusCode = 503;
    this.expose = true;
  }
}

export class ExecutionOutputLimitError extends Error {
  constructor() {
    super('Program output exceeded the 64 KB limit.');
    this.name = 'ExecutionOutputLimitError';
    this.statusCode = 413;
  }
}

function runDocker(args, { input, timeoutMs, outputLimit = MAX_DIAGNOSTIC_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.DOCKER_BIN || 'docker', args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let settled = false;
    let timedOut = false;
    let outputExceeded = false;

    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };

    const append = (current, chunk) => {
      const combined = Buffer.concat([current, chunk]);
      if (combined.length > outputLimit) {
        outputExceeded = true;
        child.kill();
        return current;
      }
      return combined;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = append(stderr, chunk);
    });
    child.on('error', (error) => {
      settle(reject, new ExecutionUnavailableError(
        error.code === 'ENOENT'
          ? 'Docker is not installed or is not available on the execution worker.'
          : `Unable to start Docker: ${error.message}`,
      ));
    });
    child.on('close', (code) => {
      if (timedOut) {
        settle(resolve, { timedOut: true, code, stdout: stdout.toString(), stderr: stderr.toString() });
      } else if (outputExceeded) {
        settle(reject, new ExecutionOutputLimitError());
      } else {
        settle(resolve, { code, stdout: stdout.toString(), stderr: stderr.toString() });
      }
    });

    child.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') {
        settle(reject, new ExecutionUnavailableError(`Docker input failed: ${error.message}`));
      }
    });
    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

async function removeContainer(containerName) {
  try {
    const result = await runDocker(['rm', '--force', containerName], {
      timeoutMs: CLEANUP_TIMEOUT_MS,
      outputLimit: MAX_DIAGNOSTIC_BYTES,
    });
    if (result.code !== 0) {
      console.error(`Unable to remove execution container ${containerName}: ${result.stderr.trim()}`);
    }
  } catch (error) {
    console.error(`Unable to remove execution container ${containerName}:`, error);
  }
}

function normalizeOutput(value) {
  return value.replace(/\r\n/g, '\n').trim();
}

export async function executeTestCase({
  language,
  code,
  input,
  expectedOutput,
  timeoutMs = 5000,
}) {
  const runtime = RUNTIMES[language];
  if (!runtime) throw new ExecutionUnavailableError(`No isolated runtime is configured for ${language}.`);

  const workspace = await mkdtemp(join(tmpdir(), 'cera-exec-'));
  const containerName = `cera-exec-${randomUUID()}`;
  let containerCreated = false;

  try {
    await writeFile(join(workspace, runtime.filename), code, { mode: 0o444 });
    const created = await runDocker([
      'create',
      '--name', containerName,
      '--interactive',
      ...SANDBOX_OPTIONS,
      '--mount', `type=bind,source=${workspace},target=/code,readonly`,
      '--workdir=/tmp',
      runtime.image,
      ...runtime.command,
    ], { timeoutMs: 15000 });
    if (created.code !== 0) {
      throw new ExecutionUnavailableError(
        `Unable to create the isolated runtime container: ${created.stderr.trim() || 'Docker returned an error.'}`,
      );
    }
    containerCreated = true;

    const startedAt = Date.now();
    const execution = await runDocker(
      ['start', '--attach', '--interactive', containerName],
      { input, timeoutMs, outputLimit: MAX_OUTPUT_BYTES },
    );
    const executionTimeMs = Date.now() - startedAt;
    if (execution.timedOut) {
      return {
        status: 'Timeout',
        actualOutput: '',
        diagnostic: 'Execution exceeded the time limit.',
        executionTimeMs,
      };
    }

    const status = execution.code === 0
      && normalizeOutput(execution.stdout) === normalizeOutput(expectedOutput)
      ? 'Passed'
      : execution.code === 0
        ? 'Failed'
        : 'Error';

    return {
      status,
      actualOutput: execution.stdout,
      diagnostic: status === 'Error' ? execution.stderr.trim() : '',
      executionTimeMs,
    };
  } finally {
    if (containerCreated) await removeContainer(containerName);
    await rm(workspace, { recursive: true, force: true });
  }
}
