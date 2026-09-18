export const faculty = {
  name: 'Dr. Aisha Rahman',
  department: 'Computer Science',
  institution: 'Northstar University',
};

export const dashboardMetrics = {
  activeLabs: {
    value: 24,
    trend: '6 more than yesterday',
  },

  pendingEvaluations: {
    value: 18,
    trend: '4 due today',
  },

  averagePassRate: {
    value: 86.4,
    trend: '+3.2% this week',
  },

  activeAssignments: {
    value: 12,
    trend: '2 closing this week',
  },
};

export const evaluationQueueHealth = {
  estimatedTime: '2h 40m',

  todayProgress: {
    completed: 32,
    target: 50,
  },
};

export const dashboardSubmissions = {
  total: 1284,
  change: '+12.8%',
  label: 'submissions received',
};

export const dashboardSubmissionTrend = {
  points: [
    72,
    61,
    78,
    55,
    59,
    43,
    48,
    35,
    44,
    29,
    37,
    22,
    30,
    17,
  ],

  labels: [
    'Oct 08',
    'Oct 11',
    'Oct 14',
    'Oct 17',
    'Oct 20',
    'Oct 23',
    'Today',
  ],
};

export const dashboardQuickActions = {
  evaluationQueue: {
    label: 'Review evaluation queue',
    detail: '18 submissions are waiting',
    href: '/evaluation-queue',
  },

  integrityRisks: {
    label: 'Inspect integrity risks',
    detail: '3 matches need attention',
    href: '/plagiarism',
  },

  courseReport: {
    label: 'Generate course report',
    detail: 'Ready for export',
    href: '/reports',
  },
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

export const languageUsage = [
  {
    name: 'Python',
    value: 48,
    color: '#6366F1',
  },
  {
    name: 'Java',
    value: 27,
    color: '#22D3EE',
  },
  {
    name: 'C++',
    value: 18,
    color: '#8B5CF6',
  },
  {
    name: 'JavaScript',
    value: 7,
    color: '#F59E0B',
  },
];

export const recentActivity = [
  {
    id: 'activity-1',
    title: 'Maya Patel submitted Graph Traversal Lab',
    time: '2 min ago',
  },
  {
    id: 'activity-2',
    title: 'Risk score raised for SUB-8819',
    time: '14 min ago',
  },
  {
    id: 'activity-3',
    title: 'Graph Traversal Lab test cases updated',
    time: '38 min ago',
  },
  {
    id: 'activity-4',
    title: 'Dr. Chen joined CS 204 faculty team',
    time: '1 hr ago',
  },
];

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

export const difficultyAnalysisData = {
  'asg-104': {
    difficulty: '7.4 / 10',
    difficultyTrend: 'Advanced',
    completion: '48m',
    completionTrend: '+8m vs target',
    help: '17',
    helpTrend: 'Mostly test case 4',
    pass: '61%',
    passTrend: '-5.2% from last lab',

    executionTraces: 184,

    stuck: [
      [
        'Implementing priority queue',
        82,
        'var(--primary)',
      ],
      [
        'Handling disconnected nodes',
        64,
        'var(--secondary)',
      ],
      [
        'Runtime optimization',
        49,
        'var(--warning)',
      ],
      [
        'Input parsing',
        28,
        'var(--accent)',
      ],
    ],

    recommendationTitle:
      'Add a priority queue hint',

    recommendation:
      'Learners are spending 18 minutes on queue setup before reaching the graph logic. Add a short API example to the brief.',
  },

  'asg-102': {
    difficulty: '6.2 / 10',
    difficultyTrend: 'Intermediate',
    completion: '39m',
    completionTrend: '+3m vs target',
    help: '11',
    helpTrend: 'Mostly recursion depth',
    pass: '74%',
    passTrend: '+2.8% from last lab',

    executionTraces: 156,

    stuck: [
      [
        'Understanding recursion state',
        71,
        'var(--primary)',
      ],
      [
        'Backtracking conditions',
        58,
        'var(--secondary)',
      ],
      [
        'Handling base cases',
        43,
        'var(--warning)',
      ],
      [
        'Input parsing',
        24,
        'var(--accent)',
      ],
    ],

    recommendationTitle:
      'Add a recursion example',

    recommendation:
      'Learners are spending extra time understanding the recursive state. Add a small worked example showing how the call stack changes.',
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

export const liveStudents = [
  {
    id: 'ST-042',
    name: 'Maya Patel',
    initials: 'MP',
    task: 'Dijkstra’s shortest path',
    lang: 'Python',
    status: 'Running tests',
    time: '18:42',
    color: '#6366F1',
  },
  {
    id: 'ST-087',
    name: 'Ethan Cole',
    initials: 'EC',
    task: 'Dijkstra’s shortest path',
    lang: 'C++',
    status: 'Coding',
    time: '16:08',
    color: '#0EA5E9',
  },
  {
    id: 'ST-019',
    name: 'Priya Nair',
    initials: 'PN',
    task: 'Dijkstra’s shortest path',
    lang: 'Java',
    status: 'Passed',
    time: '14:51',
    color: '#10B981',
  },
  {
    id: 'ST-112',
    name: 'Lucas Martin',
    initials: 'LM',
    task: 'Dijkstra’s shortest path',
    lang: 'Python',
    status: 'Needs help',
    time: '12:23',
    color: '#F59E0B',
  },
  {
    id: 'ST-061',
    name: 'Zoe Kim',
    initials: 'ZK',
    task: 'Dijkstra’s shortest path',
    lang: 'Python',
    status: 'Coding',
    time: '09:37',
    color: '#8B5CF6',
  },
];

export const liveLabHealth = {
  healthy: 18,
  slow: 3,
  critical: 3,
};

export const liveLabAttention = {
  studentId: 'ST-112',
  issue: 'Failed test runs',
  count: 4,
};

export const liveLabInfo = {
  course: 'CS 301 · Algorithms',
  lab: 'Graph Traversal Lab',
};

/* =========================
   LIVE LAB DATA ACCESS
========================= */

export function getLiveLabData() {
  return {
    info: {
      ...liveLabInfo,
    },

    students: [
      ...liveStudents,
    ],

    health: {
      ...liveLabHealth,
    },

    attention: {
      ...liveLabAttention,
    },
  };
}
export const plagiarismData = {
  kpis: {
    submissionsScanned: {
      label: 'Submissions scanned',
      value: '1,284',
      trend: '100% coverage',
    },

    needsReview: {
      label: 'Needs review',
      value: '3',
      trend: '2 new today',
    },

    highestSimilarity: {
      label: 'Highest similarity',
      value: '78%',
      trend: 'SUB-8798 vs SUB-8804',
    },

    clearedThisWeek: {
      label: 'Cleared this week',
      value: '29',
      trend: 'All documented',
    },
  },

  similaritySignals: [
    {
      id: 'PLAG-001',
      pair: 'SUB-8798 · SUB-8804',
      assignment: 'Hash Tables from Scratch',
      similarity: '78%',
      sharedRegion: '42 lines',
      status: 'Investigate',
    },

    {
      id: 'PLAG-002',
      pair: 'SUB-8764 · SUB-8769',
      assignment: 'Recursion & Backtracking',
      similarity: '46%',
      sharedRegion: '18 lines',
      status: 'Review',
    },

    {
      id: 'PLAG-003',
      pair: 'SUB-8731 · SUB-8740',
      assignment: 'Memory-safe Linked Lists',
      similarity: '31%',
      sharedRegion: '9 lines',
      status: 'Likely coincidental',
    },
  ],

  comparison: {
    similarity: '78%',

    left: {
      name: 'Lucas Martin',
      id: 'SUB-8798',
      language: 'Python',
      initials: 'LM',
      color: null,
      role: 'Original submission',
      code: `distances = dict.fromkeys(graph, float('inf'))
queue = [(0, source)]

heappush(queue, (distance, neighbor))`,
    },

    right: {
      name: 'Jordan Lee',
      id: 'SUB-8804',
      language: 'Python',
      initials: 'JL',
      color: '#10B981',
      role: 'Comparison submission',
      code: `distances = dict.fromkeys(graph, float('inf'))
queue = [(0, source)]

heappush(queue, (distance, neighbor))`,
    },

    highlightedLine:
      'heappush(queue, (distance, neighbor))',
  },
};
export const reportsData = {
  reportSections: [
    {
      id: 'course-performance',
      label: 'Course performance summary',
      defaultSelected: true,
    },
    {
      id: 'difficulty-analysis',
      label: 'Assignment difficulty analysis',
      defaultSelected: true,
    },
    {
      id: 'student-progress',
      label: 'Student progress and risks',
      defaultSelected: true,
    },
    {
      id: 'integrity-overview',
      label: 'Academic integrity overview',
      defaultSelected: true,
    },
    {
      id: 'submission-trends',
      label: 'Submission volume and trends',
      defaultSelected: false,
    },
  ],

  recentExports: [
    {
      id: 'report-001',
      title: 'CS 301 Midterm review',
      daysAgo: 1,
      format: 'PDF',
      size: '2.4 MB',
    },
    {
      id: 'report-002',
      title: 'Integrity audit · October',
      daysAgo: 2,
      format: 'PDF',
      size: '2.4 MB',
    },
    {
      id: 'report-003',
      title: 'Department progress update',
      daysAgo: 3,
      format: 'PDF',
      size: '2.4 MB',
    },
  ],
};
export const notificationsData = [
  {
    id: 1,
    title: 'Live lab needs attention',
    message:
      'Lucas Martin has requested help in Graph Traversal Lab.',
    time: '8 min ago',
    tone: 'warning',
    route: '/live-lab',
    read: false,
  },
  {
    id: 2,
    title: 'New submission received',
    message:
      'Maya Patel submitted Graph Traversal Lab.',
    time: '12 min ago',
    tone: 'live',
    route: '/submissions',
    read: false,
  },
  {
    id: 3,
    title: 'Integrity signal detected',
    message:
      'A high-similarity pair is ready for review.',
    time: '1 hr ago',
    tone: 'error',
    route: '/plagiarism',
    read: false,
  },
  {
    id: 4,
    title: 'Report finished',
    message:
      'CS 301 weekly report is ready to download.',
    time: 'Yesterday',
    tone: 'success',
    route: '/reports',
    read: false,
  },
];