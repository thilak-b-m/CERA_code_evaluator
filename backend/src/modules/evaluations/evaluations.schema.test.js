import assert from 'node:assert/strict';
import test from 'node:test';
import { EvaluationValidationError, parseEvaluationInput } from './evaluations.schema.js';

test('evaluation validates score bounds, feedback, and publication status', () => {
  assert.deepEqual(
    parseEvaluationInput({ score: '7.5', feedback: 'Good work', status: 'published' }, 10),
    { score: 7.5, feedback: 'Good work', status: 'published' },
  );
  assert.throws(
    () => parseEvaluationInput({ score: 11, feedback: '', status: 'published' }, 10),
    EvaluationValidationError,
  );
  assert.throws(
    () => parseEvaluationInput({ score: 10, feedback: '  ', status: 'published' }, 10),
    /Feedback is required/,
  );
  assert.throws(
    () => parseEvaluationInput({ score: '', feedback: '', status: 'draft' }, 10),
    /A score is required/,
  );
  assert.deepEqual(
    parseEvaluationInput({
      score: 8,
      feedback: 'Faculty feedback.',
      aiFeedback: 'AI feedback.',
      guidance: {
        category: 'logic',
        issue: 'The loop omits the final item.',
        explanation: 'The boundary is exclusive.',
        correctionSteps: ['Include the final item.'],
        correctedCode: 'for item in items:\n    process(item)',
      },
      status: 'published',
    }, 10),
    {
      score: 8,
      feedback: 'Faculty feedback.',
      aiFeedback: 'AI feedback.',
      guidance: {
        category: 'logic',
        issue: 'The loop omits the final item.',
        explanation: 'The boundary is exclusive.',
        correctionSteps: ['Include the final item.'],
        correctedCode: 'for item in items:\n    process(item)',
      },
      status: 'published',
    },
  );
  assert.deepEqual(
    parseEvaluationInput({
      score: 10,
      feedback: 'The solution meets the stated requirements and no definite defect was found.',
      guidance: {
        category: 'none',
        issue: 'No definite defect was identified.',
        explanation: 'The implementation satisfies the stated behavior and no failure is supported by the available evidence.',
        correctionSteps: [],
        correctedCode: '',
      },
      status: 'published',
    }, 10).guidance.correctionSteps,
    [],
  );
  assert.throws(
    () => parseEvaluationInput({
      score: 8,
      feedback: 'Faculty feedback.',
      aiFeedback: 'x'.repeat(5001),
    }, 10),
    /AI feedback must be 5000 characters or fewer/,
  );
  assert.throws(
    () => parseEvaluationInput({
      score: 8,
      feedback: 'Feedback.',
      guidance: {
        category: 'unexpected',
        issue: 'Issue.',
        explanation: 'Explanation.',
        correctionSteps: [],
        correctedCode: '',
      },
    }, 10),
    /AI correction guidance is invalid/,
  );
});
