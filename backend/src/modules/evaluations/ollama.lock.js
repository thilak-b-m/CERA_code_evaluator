let queue = Promise.resolve();

// The local model is a shared, memory-heavy resource. Serialize all grading
// calls in this API process, including the single-submission faculty workflow.
export function withOllamaLock(task) {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}
