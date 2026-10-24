# Why AI Auto-Evaluation Takes 1.5–2 Minutes

This note explains the current CERA evaluation flow and the likely sources of the delay. The reported 1.5–2 minutes is a user-observed duration; without the corresponding queue and Ollama log values, it is not possible to assign that time to one specific stage.

## What happens for one submission

For each queued submission, the backend:

1. Claims the job and loads the stored submission and any existing evaluation from MongoDB.
2. Runs the submission against the assignment's public executable test cases through the Docker runner to prepare trusted execution evidence. If execution is unavailable, grading continues with an explicit unavailable-evidence note.
3. Sends the assignment, rubric, submitted source code, and execution evidence to the configured local Ollama model. The application currently defaults to `qwen2.5-coder:14b`; `OLLAMA_MODEL` can override that default.
4. Waits for the complete response. The Ollama request uses `stream: false`, so the UI does not receive incremental grading text while the model is working.
5. Validates the model's JSON response, saves the evaluation, and marks the queue job complete.

The relevant implementation is in [evaluation-queue.service.js](backend/src/modules/evaluations/evaluation-queue.service.js), [submissions.service.js](backend/src/modules/submissions/submissions.service.js), and [ollama.service.js](backend/src/modules/evaluations/ollama.service.js).

## Why the model step can take that long

The most likely large contributor is local inference with a 14-billion-parameter model. The model must process the full grading prompt and submission, then generate a structured response. The time depends on the computer running Ollama: available RAM and GPU memory, whether the model is already loaded, whether all model layers fit on the GPU, prompt length, and generation speed. CERA's code and the reported time alone do not establish which of these conditions applies on your machine.

The request allows a context size between 8,192 and 32,768 tokens, based on the prompt size, and permits up to 2,048 generated tokens. These are limits, not amounts that every request necessarily uses. The system prompt, assignment details, source code, and test evidence all contribute to the input that Ollama processes.

Ollama reports model loading, prompt processing, and output generation durations separately in its response metrics. CERA records those values as milliseconds, plus prompt and generated token counts and generated tokens per second. The measurements are read from Ollama's response, whose duration values are nanoseconds; CERA converts each by dividing by 1,000,000. If an Ollama metric is missing or invalid, the corresponding field is logged/stored as unavailable rather than failing grading. When `total_duration` is missing, CERA uses its measured request wall time; token rate is left unavailable unless both generated-token count and a positive generation duration are present. See the [Ollama API usage metrics](https://github.com/ollama/ollama/blob/main/docs/api/usage.mdx).

CERA also measures Docker execution/evidence collection and time waiting for the shared Ollama lock. `databaseMs` measures saving the evaluation. `totalMs` measures processing from the worker starting the job through evaluation persistence; it excludes the final queue-state update and lock cleanup. `queueWaitMs` is separate and measures time from enqueueing until a worker starts the job.

## Why a batch takes longer than one evaluation

The queue processes jobs sequentially. It also uses a shared lock to ensure only one Ollama grading request runs at a time in this API process. This avoids competing requests against a memory-heavy local model, but means batch duration grows roughly with the sum of each student's processing time.

For example, if each job takes 1.5–2 minutes and queue waiting and setup are small, 10 submissions could take around 15–20 minutes to finish. That is an estimate, not a guarantee. A job's `queueWaitMs` can add more time if other jobs are ahead of it. The faculty page polls for status every 2.5 seconds, so the UI may show a completed status shortly after the backend has already finished.

Transient Ollama failures can be retried once by default, after a 3-second delay. The request timeout defaults to 300 seconds; it is an upper bound before a request fails, not a delay added to every evaluation. Both settings can be overridden in the backend environment.

## How to find the actual bottleneck

Look for these messages in the backend terminal for the same job ID:

```text
[AI queue] Job <jobId> started; queueWaitMs=...; attempt=...
[AI queue] Ollama lock acquired for job <jobId>; lockWaitMs=...
[AI queue] Ollama request started for job <jobId>; model=...
[AI queue] Ollama request completed for job <jobId>; durationMs=...; loadDurationMs=...; promptEvalDurationMs=...; evalDurationMs=...; promptTokens=...; generatedTokens=...; tokensPerSecond=...
[AI queue] Job <jobId> completed; executionEvidenceMs=...; ollamaLockWaitMs=...; ollamaMs=...; dbMs=...; totalMs=...; tokens=...; tokensPerSecond=...
```

Use them as follows:

- **High `queueWaitMs`:** the submission waited behind other work before processing began.
- **High `ollamaMs` close to `totalMs`:** most elapsed time was inside the model request. `promptTokens`, `generatedTokens`, and `tokensPerSecond` provide context for input size and output speed.
- **Large gap between `totalMs` and `ollamaMs`:** compare `executionEvidenceMs`, `ollamaLockWaitMs`, and `databaseMs` to see which measured stages account for the time. Remaining time includes submission/evaluation lookups and queue bookkeeping. `databaseMs` isolates saving the evaluation; `totalMs` excludes the final queue-state update and lock cleanup.
- **`attempt=2` or a retry log:** a transient failure caused an extra attempt and retry delay.

The same timing fields are saved on the `evaluation_jobs` document under `timings`, keyed by the job ID. The current batch response does not expose those timing fields; the backend terminal logs are the easiest way to inspect a run. CERA does not log the computer's CPU/GPU usage, so the measurements can identify a slow model stage but cannot by themselves explain whether it is caused by CPU/GPU offloading or limited hardware.

## Summary

A 1.5–2 minute evaluation can come from Ollama inference, model loading, Docker evidence collection, lock contention, or combinations of these stages. Compare per-job timing fields before attributing the delay to one cause. The measurements identify where time is spent; CPU/GPU utilization and the machine's hardware are still needed to diagnose why local inference is slow.
