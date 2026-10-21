import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeTestCase } from './execution.worker.js';

test('execution reports an unavailable isolated worker without running code on the host', async () => {
  const previousDockerBin = process.env.DOCKER_BIN;
  process.env.DOCKER_BIN = join(tmpdir(), `missing-docker-${randomUUID()}`);
  try {
    await assert.rejects(
      executeTestCase({
        language: 'python',
        code: 'print("must not run on the API host")',
        input: '',
        expectedOutput: '',
      }),
      { name: 'ExecutionUnavailableError', statusCode: 503 },
    );
  } finally {
    if (previousDockerBin === undefined) delete process.env.DOCKER_BIN;
    else process.env.DOCKER_BIN = previousDockerBin;
  }
});
