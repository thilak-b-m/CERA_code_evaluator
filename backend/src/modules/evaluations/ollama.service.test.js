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
  assert.equal(request.body.format.type, 'object');
  assert.deepEqual(request.body.format.required, ['score', 'feedback', 'guidance']);
  assert.equal(request.body.options.temperature, 0);
  assert.ok(request.body.options.num_ctx >= 8192 && request.body.options.num_ctx <= 32768);
  assert.equal(request.body.options.num_predict, 768);
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

test('Ollama response timing and token metadata can be collected without changing default evaluation output', async () => {
  const timestamps = [];
  const evaluation = await generateEvaluationWithOllama({
    ...input,
    includeMetrics: true,
    onRequestStart: (startedAt) => timestamps.push(startedAt),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          message: { content: JSON.stringify({
            score: 8,
            feedback: validGuidance.explanation,
            guidance: validGuidance,
          }) },
          total_duration: 2_000_000_000,
          load_duration: 150_000_000,
          prompt_eval_duration: 250_000_000,
          prompt_eval_count: 120,
          eval_count: 30,
          eval_duration: 1_000_000_000,
        };
      },
    }),
  });

  assert.equal(timestamps.length, 1);
  assert.equal(evaluation.metrics.promptTokens, 120);
  assert.equal(evaluation.metrics.generatedTokens, 30);
  assert.equal(evaluation.metrics.loadDurationMs, 150);
  assert.equal(evaluation.metrics.promptEvalDurationMs, 250);
  assert.equal(evaluation.metrics.evalDurationMs, 1000);
  assert.equal(evaluation.metrics.tokensPerSecond, 30);
  assert.ok(evaluation.metrics.totalDurationMs >= 0);
  assert.ok(evaluation.metrics.completedAt);
});

test('missing Ollama timing and token metrics remain null without failing the evaluation', async () => {
  const evaluation = await generateEvaluationWithOllama({
    ...input,
    includeMetrics: true,
    fetchImpl: async () => captureResponse({
      score: 8,
      feedback: validGuidance.explanation,
      guidance: validGuidance,
    }),
  });

  assert.equal(evaluation.score, 8);
  assert.ok(evaluation.metrics.totalDurationMs >= 0);
  assert.equal(evaluation.metrics.loadDurationMs, null);
  assert.equal(evaluation.metrics.promptEvalDurationMs, null);
  assert.equal(evaluation.metrics.evalDurationMs, null);
  assert.equal(evaluation.metrics.promptTokens, null);
  assert.equal(evaluation.metrics.generatedTokens, null);
  assert.equal(evaluation.metrics.tokensPerSecond, null);
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
  assert.match(system, /authoritative source of verified automated outcomes/);
  assert.match(system, /must not claim that the code was executed/);
  assert.match(system, /Prioritise technical correctness over output length/);
  assert.match(system, /functional correctness, coverage of stated requirements/);
  assert.match(system, /complexity when the assignment or criteria make it relevant/);
  assert.match(system, /do not invent requirements, mandatory algorithms, numerical subscores, fixed weights/);
  assert.match(system, /does not automatically mean zero/);
  assert.match(system, /award partial credit when supported by that evidence/);
  assert.match(system, /not equivalent to an empty, fundamentally incorrect/);
  assert.match(system, /execution infrastructure is not proof that student code is incorrect/);
  assert.match(system, /Do not count every failed test as a separate defect/);
  assert.match(system, /without applying a test-pass formula/);
  assert.match(system, /assignment passing percentage must not affect it/);
});

test('Max Sum Subarray regression cases use the real prompt, stated constraints, rubric, and unavailable evidence', async () => {
  const assignmentDescription = [
    'Input: integer N followed by N comma-separated integers.',
    'Constraint: 1 <= N <= 200000.',
    'Output: maximum sum of a non-empty contiguous subarray.',
    'Required time complexity: O(N).',
  ].join(' ');
  const evaluationCriteria = 'Correctness 40 marks; negative values and edge cases 20 marks; time complexity 30 marks; input/output correctness 10 marks.';
  const cases = [
    {
      name: 'Kadane linear solution',
      code: 'n = int(input())\nnums = list(map(int, input().split(\',\')))\ncurrent = best = nums[0]\nfor value in nums[1:]:\n    current = max(value, current + value)\n    best = max(best, current)\nprint(best)',
    },
    {
      name: 'all-negative handling defect',
      code: 'n = int(input())\nnums = list(map(int, input().split(\',\')))\ncurrent = best = 0\nfor value in nums:\n    current = max(0, current + value)\n    best = max(best, current)\nprint(best)',
    },
    {
      name: 'correct quadratic brute force',
      code: 'n = int(input())\nnums = list(map(int, input().split(\',\')))\nbest = nums[0]\nfor start in range(n):\n    total = 0\n    for end in range(start, n):\n        total += nums[end]\n        best = max(best, total)\nprint(best)',
    },
  ];

  for (const scenario of cases) {
    let request;
    await generateEvaluationWithOllama({
      ...input,
      assignmentTitle: 'Maximum Sum Subarray',
      assignmentDescription,
      evaluationCriteria,
      language: 'python',
      code: scenario.code,
      maxScore: 100,
      execution: { available: false, reason: 'Regression scenario: execution deliberately unavailable.' },
      fetchImpl: async (url, options) => {
        request = JSON.parse(options.body);
        return captureResponse({ score: 50, feedback: validGuidance.explanation, guidance: validGuidance });
      },
    });

    const assessment = JSON.parse(request.messages[1].content.split('\n').at(-1));
    const system = request.messages[0].content;
    assert.equal(assessment.assignmentTitle, 'Maximum Sum Subarray');
    assert.equal(assessment.assignmentDescription, assignmentDescription);
    assert.equal(assessment.evaluationCriteria, evaluationCriteria);
    assert.equal(assessment.maxScore, 100);
    assert.equal(assessment.submittedCode, scenario.code, scenario.name);
    assert.equal(assessment.executionEvidence.available, false);
    assert.match(assessment.executionEvidence.note, /code was NOT run/);
    assert.match(system, /relevant boundaries within the stated constraints/);
    assert.match(system, /do not penalize missing empty-input handling when the assignment guarantees N >= 1/);
    assert.match(system, /Use explicit rubric criteria and their stated weights or marks when supplied/);
    assert.match(system, /Separate functional correctness from efficiency/);
    assert.match(system, /deduct under the relevant complexity criterion only/);
  assert.match(system, /never call a supplied format or requirement unspecified/);
  assert.match(system, /award credit for criteria the code demonstrably meets/);
  }
});

test('assessment scenarios retain the existing input and response contract across score scales', async () => {
  const scenarios = [
    {
      name: 'correct solution',
      code: 'a, b = map(int, input().split())\nprint(a + b)',
      criteria: 'Handle negative values.',
      execution: { available: true, summary: { status: 'Passed', total: 1, passed: 1 }, testCases: [] },
    },
    {
      name: 'major syntax error',
      code: 'def (',
      criteria: '',
      execution: { available: true, summary: { status: 'Failed', total: 1, passed: 0 }, testCases: [
        { status: 'Error', input: '', expectedOutput: '', actualOutput: '', diagnostic: 'SyntaxError', executionTimeMs: 1 },
      ] },
    },
    {
      name: 'incorrect algorithm with one shared cause across failures',
      code: 'print(0)',
      criteria: 'Return the sum.',
      execution: { available: true, summary: { status: 'Failed', total: 2, passed: 0 }, testCases: [
        { status: 'Failed', input: '1 2', expectedOutput: '3', actualOutput: '0', diagnostic: '', executionTimeMs: 1 },
        { status: 'Failed', input: '4 5', expectedOutput: '9', actualOutput: '0', diagnostic: '', executionTimeMs: 1 },
      ] },
    },
    {
      name: 'partially correct implementation',
      code: 'total = 0\nfor value in values:\n    if value > 0: total += value',
      criteria: 'Sum every provided value, including negative values.',
      execution: { available: true, summary: { status: 'Failed', total: 2, passed: 1 }, testCases: [
        { status: 'Passed', input: '2 3', expectedOutput: '5', actualOutput: '5', diagnostic: '', executionTimeMs: 1 },
        { status: 'Failed', input: '-2 3', expectedOutput: '1', actualOutput: '3', diagnostic: '', executionTimeMs: 1 },
      ] },
    },
    {
      name: 'runtime crash',
      code: 'print(values[4])',
      criteria: '',
      execution: { available: true, summary: { status: 'Failed', total: 1, passed: 0 }, testCases: [
        { status: 'Error', input: '1', expectedOutput: '1', actualOutput: '', diagnostic: 'IndexError', executionTimeMs: 1 },
      ] },
    },
    {
      name: 'timeout',
      code: 'while True: pass',
      criteria: '',
      execution: { available: true, summary: { status: 'Failed', total: 1, passed: 0 }, testCases: [
        { status: 'Timeout', input: '', expectedOutput: '', actualOutput: '', diagnostic: 'Execution exceeded the time limit.', executionTimeMs: 5000 },
      ] },
    },
    {
      name: 'execution unavailable',
      code: 'print(3)',
      criteria: '',
      execution: { available: false, reason: 'Docker is not installed.' },
    },
    {
      name: 'explicit complexity requirement',
      code: 'print(sum(values))',
      criteria: 'Use an O(n) time algorithm and O(1) extra space.',
      execution: undefined,
    },
    {
      name: 'no complexity requirement',
      code: 'print(sum(values))',
      criteria: '',
      execution: undefined,
    },
  ];

  for (const scenario of scenarios) {
    let request;
    const maxScore = 25;
    const modelScore = maxScore * 0.72;
    const evaluation = await generateEvaluationWithOllama({
      ...input,
      assignmentTitle: scenario.name,
      assignmentDescription: 'Read the provided values and return their sum.',
      evaluationCriteria: scenario.criteria,
      code: scenario.code,
      maxScore,
      execution: scenario.execution,
      fetchImpl: async (url, options) => {
        request = JSON.parse(options.body);
        return captureResponse({
          score: modelScore,
          feedback: 'The approach reads the provided values, but the specific implementation and execution evidence determine whether it meets the requested behavior.',
          guidance: { ...validGuidance, issue: 'Review the implementation against the stated behavior.' },
        });
      },
    });

    const assessment = JSON.parse(request.messages[1].content.split('\n').at(-1));
    assert.equal(assessment.assignmentTitle, scenario.name);
    assert.equal(assessment.maxScore, maxScore);
    assert.equal(assessment.submittedCode, scenario.code);
    assert.equal(evaluation.score, modelScore);
    assert.equal(typeof evaluation.score, 'number');
    assert.ok(evaluation.score >= 0 && evaluation.score <= maxScore);
    assert.equal(Object.keys(evaluation).sort().join(','), 'feedback,guidance,score,status');
    assert.equal(Object.keys(evaluation.guidance).sort().join(','), 'category,correctedCode,correctionSteps,explanation,issue');
    if (scenario.criteria) assert.equal(assessment.evaluationCriteria, scenario.criteria);
    if (!scenario.criteria) assert.equal(assessment.evaluationCriteria, 'No additional criteria supplied.');
    if (scenario.execution?.available) {
      assert.equal(assessment.executionEvidence.available, true);
      for (const testCase of scenario.execution.testCases || []) {
        if (testCase.status === 'Timeout') assert.equal(assessment.executionEvidence.testCases[0].status, 'Timeout');
      }
    } else {
      assert.equal(assessment.executionEvidence.available, false);
    }
  }
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

test('a compilation failure is provided as evidence without backend zero-score conversion', async () => {
  let request;
  const modelScore = input.maxScore * 0.63;
  const evaluation = await generateEvaluationWithOllama({
    ...input,
    code: 'def add(a, b)\n    return a + b',
    execution: {
      available: true,
      source: 'server',
      summary: { status: 'Failed', total: 1, passed: 0, executionTimeMs: 3 },
      testCases: [{
        status: 'Error',
        input: '1 2',
        expectedOutput: '3',
        actualOutput: '',
        diagnostic: 'SyntaxError: expected colon',
        executionTimeMs: 3,
      }],
    },
    fetchImpl: async (url, options) => {
      request = JSON.parse(options.body);
      return captureResponse({
        score: modelScore,
        feedback: 'The function has a syntax error because its definition is missing a colon. The intended addition logic is otherwise identifiable, but the program cannot compile until the definition is corrected.',
        guidance: {
          category: 'syntax',
          issue: 'The function definition is missing a colon.',
          explanation: 'Python requires a colon after the function signature; without it the program cannot compile. Add the colon, then rerun the example input to confirm the function produces the expected sum.',
          correctionSteps: ['Add a colon after the function signature.', 'Run the code with input 1 2.'],
          correctedCode: 'def add(a, b):\n    return a + b',
        },
      });
    },
  });

  assert.match(request.messages[1].content, /SyntaxError: expected colon/);
  assert.equal(evaluation.score, modelScore);
  assert.notEqual(evaluation.score, 0);
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
    (error) => error instanceof OllamaEvaluationError
      && error.retryable === false
      && /score must be a number/.test(error.message),
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
    (error) => error instanceof OllamaEvaluationError && /guidance must be an object/.test(error.message),
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
      && /feedback must contain/.test(error.message),
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
    (error) => error instanceof OllamaEvaluationError && /correctionSteps must contain 1 to/.test(error.message),
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
    (error) => error instanceof OllamaEvaluationError && /correctionSteps must contain 1 to/.test(error.message),
  );
});

test('Ollama accepts a correct solution with no correction steps', async () => {
  const evaluation = await generateEvaluationWithOllama({
    ...input,
    fetchImpl: async () => captureResponse({
      score: 10,
      feedback: 'The solution meets the stated requirements and handles the supplied input format correctly. No definite defect was found in the submitted code.',
      guidance: {
        category: 'none',
        issue: 'No definite defect was identified in the submission.',
        explanation: 'The implementation satisfies the stated behavior, and the available evidence does not show an incorrect result or an unmet requirement.',
        correctionSteps: [],
        correctedCode: '',
      },
    }),
  });

  assert.equal(evaluation.score, 10);
  assert.deepEqual(evaluation.guidance.correctionSteps, []);
  assert.equal(evaluation.guidance.correctedCode, '');
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
    (error) => error.statusCode === 503
      && error.retryable === false
      && /ollama pull qwen2.5-coder:3b/.test(error.message),
  );
});

test('Ollama includes a bounded upstream error detail for gateway failures', async () => {
  await assert.rejects(
    generateEvaluationWithOllama({
      ...input,
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        async text() {
          return JSON.stringify({ error: 'model requires more system memory than is available' });
        },
      }),
    }),
    (error) => error.statusCode === 502
      && /HTTP 500/.test(error.message)
      && /requires more system memory/.test(error.message),
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
    (error) => error.statusCode === 503 && error.retryable === true && /Start Ollama/.test(error.message),
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
    (error) => error.statusCode === 504 && error.retryable === true && /300-second timeout/.test(error.message),
  );
});
