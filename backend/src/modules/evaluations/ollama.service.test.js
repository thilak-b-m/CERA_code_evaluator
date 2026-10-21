import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateEvaluationWithOllama,
  OllamaEvaluationError,
} from './ollama.service.js';

const input = {
  assignmentTitle: 'Add two integers',
  assignmentDescription: 'Read and print the sum of two integers.',
  evaluationCriteria: 'Handle negative inputs.',
  language: 'python',
  code: 'print(sum(map(int, input().split())))',
  maxScore: 10,
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen2.5-coder:3b',
};

const validGuidance = {
  category: 'logic',
  issue: 'The loop boundary omits the last input value and undercounts the total.',
  explanation: 'The upper bound of the loop is exclusive, so the final item is never processed. As a result the accumulated total is missing the last value for any input with more than one item, which fails the stated requirement. Inspect the loop range and confirm it includes every element before running the example input again.',
  correctionSteps: [
    'Change the loop boundary so it includes the final item.',
    'Run the revised code with the example input.',
  ],
  correctedCode: 'for item in items:\n    total += item',
};

function response(content, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return { message: { content } };
    },
  };
}

function captureResponse(evaluation) {
  return response(JSON.stringify(evaluation));
}

test('Ollama returns a bounded evaluation draft using the configured model', async () => {
  let request;
  const evaluation = await generateEvaluationWithOllama({
    ...input,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return captureResponse({
        score: 7,
        feedback: 'The loop stops before processing the final item, so the accumulated total is always too small for inputs containing more than one value. The overall approach is clear and the reading logic is correct, but the boundary must be fixed and the case re-tested before resubmission.',
        guidance: validGuidance,
      });
    },
  });

  assert.equal(request.url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(request.body.model, 'qwen2.5-coder:3b');
  assert.equal(request.body.stream, false);
  assert.equal(request.body.format, 'json');
  assert.match(request.body.messages[0].content, /each correction step must name the exact change/);
  assert.match(request.body.messages[1].content, /Handle negative inputs/);
  assert.match(request.body.messages[1].content, /print\(sum\(map/);
  assert.equal(evaluation.score, 7);
  assert.equal(evaluation.status, 'draft');
  assert.match(evaluation.feedback, /loop stops/);
  assert.equal(evaluation.guidance.category, 'logic');
  assert.equal(evaluation.guidance.correctionSteps.length, 2);
  assert.match(evaluation.guidance.correctedCode, /for item in items/);
});

test('Ollama system prompt demands a systematic static review of known defect classes', async () => {
  let request;
  await generateEvaluationWithOllama({
    ...input,
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return captureResponse({ score: 8, feedback: validGuidance.explanation, guidance: validGuidance });
    },
  });

  const system = request.messages[0].content;
  assert.match(system, /out-of-range indexing/);
  assert.match(system, /off-by-one errors/);
  assert.match(system, /division by zero/);
  assert.match(system, /Prioritise compilation failures, runtime failures/);
  assert.match(system, /never invent a problem/);
  assert.match(system, /authoritative source of truth/);
  assert.match(system, /must not claim that the code was executed/);
  assert.match(system, /Prioritise technical correctness over output length/);
});

test('Ollama forwards trusted server execution evidence to the model', async () => {
  let request;
  await generateEvaluationWithOllama({
    ...input,
    code: 'def reverse_string(s):\n    rev = ""\n    for i in range(len(s), 0, -1):\n        rev += s[i]\n    return rev\n',
    execution: {
      available: true,
      source: 'server',
      summary: { status: 'Failed', total: 2, passed: 0, executionTimeMs: 24 },
      testCases: [
        {
          status: 'Error',
          input: 'abc',
          expectedOutput: 'cba',
          actualOutput: '',
          diagnostic: 'IndexError: string index out of range',
          executionTimeMs: 12,
        },
        {
          status: 'Failed',
          input: 'Trae',
          expectedOutput: 'earT',
          actualOutput: '',
          diagnostic: '',
          executionTimeMs: 12,
        },
      ],
    },
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return captureResponse({ score: 3, feedback: validGuidance.explanation, guidance: validGuidance });
    },
  });

  const userMessage = request.messages[1].content;
  assert.match(userMessage, /"executionEvidence"/);
  assert.match(userMessage, /"available":true/);
  assert.match(userMessage, /IndexError: string index out of range/);
  assert.match(userMessage, /"actualOutput":""/);
  assert.match(userMessage, /earT/);
});

test('Ollama tells the model execution evidence is unavailable when it was not supplied', async () => {
  let request;
  await generateEvaluationWithOllama({
    ...input,
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return captureResponse({ score: 8, feedback: validGuidance.explanation, guidance: validGuidance });
    },
  });

  const userMessage = request.messages[1].content;
  assert.match(userMessage, /"executionEvidence"/);
  assert.match(userMessage, /"available":false/);
  assert.match(userMessage, /The code was NOT run/);
});

test('Ollama reports a failed execution as unavailable but never fabricates results', async () => {
  let request;
  await generateEvaluationWithOllama({
    ...input,
    execution: { available: false, source: 'server', reason: 'Docker is not installed.' },
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return captureResponse({ score: 8, feedback: validGuidance.explanation, guidance: validGuidance });
    },
  });

  const userMessage = request.messages[1].content;
  assert.match(userMessage, /"available":false/);
  assert.match(userMessage, /Docker is not installed/);
  assert.doesNotMatch(userMessage, /"testCases"/);
});

test('Ollama accepts an accurate concise diagnosis of the string-reversal IndexError', async () => {
  const evaluation = await generateEvaluationWithOllama({
    ...input,
    assignmentTitle: 'Reverse a string',
    assignmentDescription: 'Write a function that reverses a string. Empty strings must return empty strings, single-character strings remain unchanged, letter casing must be preserved, and spaces must be treated as ordinary characters.',
    evaluationCriteria: 'Reverse correctly and print the result.',
    code: 'def reverse_string(s):\n    rev = ""\n    for i in range(len(s), 0, -1):\n        rev += s[i]\n    return rev\n\nif __name__ == "__main__":\n    a = input()\n    reverse_string(a)\n',
    execution: {
      available: true,
      source: 'server',
      summary: { status: 'Failed', total: 2, passed: 1, executionTimeMs: 18 },
      testCases: [
        { status: 'Passed', input: '', expectedOutput: '', actualOutput: '', diagnostic: '', executionTimeMs: 9 },
        { status: 'Error', input: 'a', expectedOutput: 'a', actualOutput: '', diagnostic: 'IndexError: string index out of range', executionTimeMs: 9 },
      ],
    },
    fetchImpl: async () => captureResponse({
      score: 2,
      feedback: 'The reversal logic never runs correctly. For any non-empty string the first access uses s[len(s)], which is one past the end and raises IndexError, so the function crashes before returning. The empty string happens to skip the loop and returns an empty string, but that is accidental rather than correct.',
      guidance: {
        category: 'logic',
        issue: 's[i] starts at i = len(s), which is out of range and raises IndexError for every non-empty string.',
        explanation: 'The loop begins at index len(s) instead of len(s) - 1, so the very first iteration reads past the end of the string and raises IndexError. An empty string skips the loop entirely, and a single-character string therefore also crashes. Because the result is returned and never printed, the program produces no output even when the loop is fixed.',
        correctionSteps: [
          'Start the loop at len(s) - 1, or replace the manual loop with s[::-1].',
          'Wrap the call in print(...) so the reversed string reaches standard output.',
        ],
        correctedCode: 'def reverse_string(s):\n    return s[::-1]',
      },
    }),
  });

  assert.equal(evaluation.guidance.category, 'logic');
  assert.match(evaluation.guidance.issue, /IndexError/);
  assert.equal(evaluation.guidance.correctionSteps.length, 2);
  assert.match(evaluation.guidance.correctedCode, /s\[::-1\]/);
});

test('Ollama trims oversized execution evidence instead of failing the request', async () => {
  let request;
  const manyCases = Array.from({ length: 40 }, (unused, index) => ({
    status: 'Failed',
    input: 'x'.repeat(5000),
    expectedOutput: 'y'.repeat(5000),
    actualOutput: 'z'.repeat(5000),
    diagnostic: 'e'.repeat(5000),
    executionTimeMs: index,
  }));

  const evaluation = await generateEvaluationWithOllama({
    ...input,
    execution: { available: true, source: 'server', summary: { status: 'Failed', total: 40, passed: 0 }, testCases: manyCases },
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return captureResponse({ score: 1, feedback: validGuidance.explanation, guidance: validGuidance });
    },
  });

  assert.equal(evaluation.score, 1);
  assert.ok(request.messages[1].content.length < 60000);
});

test('Ollama rejects a score outside the assignment maximum', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => captureResponse({
        score: 11,
        feedback: 'Good.',
        guidance: validGuidance,
      }),
    }),
    (error) => error instanceof OllamaEvaluationError && /invalid score/.test(error.message),
  );
});

test('Ollama rejects missing correction guidance instead of returning text-only feedback', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => captureResponse({
        score: 8,
        feedback: 'This submission is long enough to satisfy the minimum feedback length so that the missing guidance object is what triggers the error.',
      }),
    }),
    (error) => error instanceof OllamaEvaluationError && /correction guidance/.test(error.message),
  );
});

test('Ollama rejects feedback that is too short to be useful', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => captureResponse({
        score: 6,
        feedback: 'Fix it.',
        guidance: validGuidance,
      }),
    }),
    (error) => error instanceof OllamaEvaluationError
      && /complete enough to explain the actual defect/.test(error.message),
  );
});

test('Ollama rejects guidance with malformed correction steps', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => captureResponse({
        score: 6,
        feedback: validGuidance.explanation,
        guidance: { ...validGuidance, correctionSteps: [] },
      }),
    }),
    (error) => error instanceof OllamaEvaluationError && /correction guidance/.test(error.message),
  );

  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => captureResponse({
        score: 6,
        feedback: validGuidance.explanation,
        guidance: { ...validGuidance, correctionSteps: [42] },
      }),
    }),
    (error) => error instanceof OllamaEvaluationError && /correction guidance/.test(error.message),
  );
});

test('Ollama rejects malformed JSON content from the model', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => response('I could not produce JSON.'),
    }),
    (error) => error instanceof OllamaEvaluationError && /not valid JSON/.test(error.message),
  );
});

test('Ollama surfaces a missing local model clearly', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => response('', 404),
    }),
    (error) => error.statusCode === 503 && /ollama pull qwen2.5-coder:3b/.test(error.message),
  );
});

test('Ollama rejects overlarge inputs instead of silently truncating code', async () => {
  let called = false;
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      code: 'x'.repeat(60001),
      fetchImpl: async () => {
        called = true;
        return response('{}');
      },
    }),
    (error) => error.statusCode === 413 && /too large/.test(error.message),
  );
  assert.equal(called, false);
});

test('Ollama connection failures explain how to restore service', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => {
        throw new Error('connection refused');
      },
    }),
    (error) => error.statusCode === 503 && /Start Ollama/.test(error.message),
  );
});

test('Ollama grading timeouts surface a clear 504 error', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => {
        const error = new Error('timed out');
        error.name = 'TimeoutError';
        throw error;
      },
    }),
    (error) => error.statusCode === 504 && /120-second timeout/.test(error.message),
  );
});
