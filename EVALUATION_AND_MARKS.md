# Assignment Evaluation and Marks Allocation

This document describes how assignment criteria, points, code execution, and evaluation currently work in CERA.

## Assignment settings

When creating or editing an assignment, faculty can set:

| Setting | What it means |
| --- | --- |
| **Points** | The maximum score available for the assignment. The API accepts values from 1 to 10,000. |
| **Evaluation conditions / complexity expectations** | Optional free-text guidance describing requirements, edge cases, complexity, or grading priorities. It is used as context during review; it is not a weighted rubric. |
| **Passing percentage** | A percentage stored with the assignment (default 40%). It is not currently used to calculate a pass/fail result or to change the score. |
| **Test cases** | Inputs and expected outputs that can be run against submitted code. Public cases can provide execution evidence during AI evaluation. |

## How a submission is evaluated

1. **The student submits code.** This creates a submission record. Submitting code does not calculate or award marks by itself.
2. **Faculty reviews the submission.** The evaluation page shows the assignment description, optional evaluation criteria, and submitted code. Faculty can enter a score and feedback, save a draft, or publish an evaluation.
3. **Code execution can supply evidence.** When AI evaluation runs, CERA executes the submitted code on the server against the assignment's public test cases. The server-generated results are passed to the AI when available. Hidden cases are not included in this evidence. If execution is unavailable, the AI is told that the code was not run and must review it statically.
4. **An evaluation records a score and feedback.** A score must be between zero and the assignment's maximum points. A published evaluation is shown as the student's result; unpublished drafts are not included in student results.

Running code from the student workspace is for trying the solution. Passing or failing those runs does **not** directly add or subtract marks.

## How the score is allocated

CERA does not currently divide points automatically among individual criteria or test cases. There is no configured allocation such as "40% correctness, 30% edge cases, 30% complexity." The optional evaluation criteria give the reviewer additional guidance, but do not have individual point weights.

The final score is a single value chosen by faculty or proposed by AI:

- **Faculty evaluation:** Faculty enters the score and feedback. The server checks that the score is within the assignment's point limit. Publishing also generates AI feedback/guidance, while keeping the faculty-entered score and feedback as the evaluation.
- **AI evaluation:** AI reviews the assignment title and description, criteria, code, and available public-test execution evidence. It proposes one score from zero up to the maximum points, plus feedback and correction guidance. The server validates the score bounds.
- **Automatic test-case marks:** There is no formula that converts the number of passed test cases into marks. Test results are evidence for the reviewer and AI, not a direct points calculation.

For example, if an assignment is worth **20 points** and the published score is **17**, the displayed result is **17/20**, or **85%**. CERA derives the percentage from `score / maximum points * 100`; it does not derive the score from the passing percentage or from a per-test-case formula.

### AI score handling and fairness

The current Ollama response contains one overall score, not separate criterion scores. CERA stores that validated score as returned; it does not manufacture correctness, edge-case, complexity, or style subscores and combine them with assumed weights. A weighted rubric requires actual per-criterion scores and agreed weights, neither of which the current response provides.

Public test execution results are sent to the model as evidence. Compilation errors, runtime errors, and failed cases are not independently translated by the server into a zero score or a test-pass percentage adjustment. The model is also given the submitted source so it can judge what is correct and what is not. This avoids double-penalizing a failure that the model has already considered. It does not guarantee partial credit: with the existing single-score response and unchanged prompt, CERA cannot reliably infer how many points an error deserves. The returned score remains subject to the assignment maximum and zero lower bound.

The AI Evaluate endpoint publishes its generated score immediately, as before. It can update an earlier AI-generated evaluation, but it returns a conflict if an evaluation already exists with faculty as its source. Faculty-entered score and feedback remain unchanged by an AI Evaluate request. Faculty can still intentionally edit and publish a score through the faculty evaluation flow.

## Drafts, publishing, and student results

- Saving a draft keeps an evaluation in draft status. Students only receive published evaluations.
- Faculty can publish an entered score and feedback, then edit and publish it again if needed.
- The current **AI Evaluate** endpoint saves the AI-generated evaluation as **published** immediately. Faculty should review the resulting score and feedback and may replace them with a faculty evaluation.
- Student result percentages and score summaries use published scores normalized against each assignment's maximum points.

## Current limitations to keep in mind

- Evaluation criteria are guidance text only; they do not create a point-by-point rubric.
- `Passing percentage` is stored and shown in assignment settings, but it currently does not drive pass/fail status or score allocation.
- Public test results provide evidence but do not directly determine a numeric score. AI evaluation is a model-generated holistic judgment, not a deterministic rubric calculation.
- Criterion-level weighted scoring and guaranteed partial credit for compile/runtime failures are not available until the AI response provides defensible per-criterion scores or the evaluation prompt/contract is changed.
- The AI evaluation path currently publishes its generated score immediately. Review the result if faculty approval is required before students see it.
