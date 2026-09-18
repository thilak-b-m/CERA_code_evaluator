export function validateTestCase(testCase) { return Boolean(testCase && testCase.input !== undefined && testCase.expected !== undefined); }
export default validateTestCase;