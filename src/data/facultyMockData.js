export const faculty = {
  name: 'Dr. Aisha Rahman',
  department: 'Computer Science',
  institution: 'Northstar University',
};

export const courses = [
  'CS 301 · Algorithms',
  'CS 204 · Systems',
];
export const testCases = {
  'asg-104': [
    {
      id: 'TC-01',
      assignmentId: 'asg-104',
      inputProfile: 'Basic connected graph',
      expected: 'Passed',
      visibility: 'Public',
      weight: 15,
    },
    {
      id: 'TC-02',
      assignmentId: 'asg-104',
      inputProfile: 'Single node',
      expected: 'Passed',
      visibility: 'Public',
      weight: 10,
    },
    {
      id: 'TC-03',
      assignmentId: 'asg-104',
      inputProfile: 'Disconnected graph',
      expected: 'Passed',
      visibility: 'Public',
      weight: 15,
    },
    {
      id: 'TC-04',
      assignmentId: 'asg-104',
      inputProfile: 'Large weighted graph',
      expected: 'Timeout',
      visibility: 'Hidden',
      weight: 20,
    },
    {
      id: 'TC-05',
      assignmentId: 'asg-104',
      inputProfile: 'Negative edge guard',
      expected: 'Passed',
      visibility: 'Hidden',
      weight: 10,
    },
  ],
};

export const assignments = [
  {
    id: 'asg-104',
    title: 'Graph Traversal Lab',
    course: 'CS 301 · Algorithms',
    due: 'Today, 11:59 PM',
    submissions: 68,
    total: 84,
    difficulty: 'Advanced',
    color: '#8B5CF6',
    description:
      'Implement Dijkstra’s algorithm to find the shortest path from a source node to every other node in a weighted graph. Your solution should handle disconnected graphs and return an array of minimum distances.',
  },
  {
    id: 'asg-103',
    title: 'Memory-safe Linked Lists',
    course: 'CS 204 · Systems',
    due: 'Tomorrow, 5:00 PM',
    submissions: 52,
    total: 72,
    difficulty: 'Intermediate',
    color: '#22D3EE',
  },
  {
    id: 'asg-102',
    title: 'Recursion & Backtracking',
    course: 'CS 301 · Algorithms',
    due: 'Oct 28, 11:59 PM',
    submissions: 91,
    total: 96,
    difficulty: 'Intermediate',
    color: '#10B981',
  },
  {
    id: 'asg-101',
    title: 'Hash Tables from Scratch',
    course: 'CS 204 · Systems',
    due: 'Oct 24, 5:00 PM',
    submissions: 78,
    total: 80,
    difficulty: 'Foundational',
    color: '#F59E0B',
  },
];

export const assignmentDetailsData = {
  'asg-104': {
    participation: '97%',
    submissionTrend: '8 in the last hour',
    passRate: '86.4%',
    passRateTrend: '+4.1% vs last lab',
    medianRuntime: '842ms',
    runtimeTrend: 'Within target',

    languages: [
      'Python',
      'Java',
      'C++',
    ],

    testCases: 8,

    qualitySignals: [
      {
        label: 'Correctness',
        value: '92%',
        tone: 'success',
      },
      {
        label: 'Performance',
        value: '78%',
        tone: 'live',
      },
      {
        label: 'Code quality',
        value: '84%',
        tone: 'warning',
      },
    ],
  },
};

export const submissions = [
  {
    id: 'SUB-8831',
    student: 'Maya Patel',
    assignmentId: 'asg-104',
    assignment: 'Graph Traversal Lab',
    lang: 'Python',
    score: 96,
    result: 'Passed',
    submitted: '2 min ago',
    time: '842ms',
  },
  {
    id: 'SUB-8827',
    student: 'Ethan Cole',
    assignmentId: 'asg-104',
    assignment: 'Graph Traversal Lab',
    lang: 'C++',
    score: 88,
    result: 'Passed',
    submitted: '8 min ago',
    time: '331ms',
  },
  {
    id: 'SUB-8822',
    student: 'Priya Nair',
    assignmentId: 'asg-103',
    assignment: 'Memory-safe Linked Lists',
    lang: 'Java',
    score: 74,
    result: 'Review',
    submitted: '34 min ago',
    time: '1.2s',
  },
  {
    id: 'SUB-8819',
    student: 'Lucas Martin',
    assignmentId: 'asg-104',
    assignment: 'Graph Traversal Lab',
    lang: 'Python',
    score: 51,
    result: 'Failed',
    submitted: '1 hr ago',
    time: '2.4s',
  },
  {
    id: 'SUB-8814',
    student: 'Zoe Kim',
    assignmentId: 'asg-102',
    assignment: 'Recursion & Backtracking',
    lang: 'Python',
    score: 100,
    result: 'Passed',
    submitted: '2 hr ago',
    time: '412ms',
  },
];

export const submissionEvaluationData = {
  'SUB-8831': {
    submittedCode: `def shortest_paths(graph, source):
    distances = dict.fromkeys(
        graph,
        float('inf')
    )

    distances[source] = 0
    queue = [(0, source)]

    while queue:
        ...`,

    aiSignal: {
      title: 'AI signal',
      message:
        'Likely correct approach. One edge case times out on the large graph test.',
    },
  },
};

export const submissionExecutionData = {
  'SUB-8831': {
    passed: 7,
    total: 8,
    time: '842ms',
    tests: [
      {
        name: 'Basic graph',
        status: 'Passed',
      },
      {
        name: 'Disconnected nodes',
        status: 'Passed',
      },
      {
        name: 'Weighted edges',
        status: 'Passed',
      },
      {
        name: 'Large graph',
        status: 'Timeout',
      },
    ],
  },
};

export const submissionQualityData = {
  'SUB-8831': {
    score: '8.4',
    feedback:
      'Clean implementation with a clear priority queue strategy. Consider extracting graph validation into a helper.',
  },
};

export const students = [
  {
    id: 'ST-042',
    name: 'Maya Patel',
    email: 'maya.patel@northstar.edu',
    initials: 'MP',
    score: 94,
    labs: '12 / 12',
    status: 'On track',
    last: '2 min ago',
    color: '#6366F1',
  },
  {
    id: 'ST-087',
    name: 'Ethan Cole',
    email: 'ethan.cole@northstar.edu',
    initials: 'EC',
    score: 88,
    labs: '11 / 12',
    status: 'On track',
    last: '8 min ago',
    color: '#0EA5E9',
  },
  {
    id: 'ST-019',
    name: 'Priya Nair',
    email: 'priya.nair@northstar.edu',
    initials: 'PN',
    score: 82,
    labs: '10 / 12',
    status: 'Needs review',
    last: '34 min ago',
    color: '#10B981',
  },
  {
    id: 'ST-112',
    name: 'Lucas Martin',
    email: 'lucas.martin@northstar.edu',
    initials: 'LM',
    score: 76,
    labs: '9 / 12',
    status: 'Needs review',
    last: '1 hr ago',
    color: '#F59E0B',
  },
  {
    id: 'ST-061',
    name: 'Zoe Kim',
    email: 'zoe.kim@northstar.edu',
    initials: 'ZK',
    score: 97,
    labs: '12 / 12',
    status: 'On track',
    last: '2 hr ago',
    color: '#8B5CF6',
  },
];

/* =========================
   LIVE LAB
========================= */
