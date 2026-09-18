const analyticsData = {
  'This term': {
    kpis: {
      enrolledStudents: {
        value: '184',
        trend: '+12 since September',
      },
      averageScore: {
        value: '82.7%',
        trend: '+4.6% this term',
      },
      engagementRate: {
        value: '91.2%',
        trend: 'Above department avg.',
      },
      atRiskStudents: {
        value: '6',
        trend: '-3 this month',
      },
    },

    submissionVolume: [
      42, 68, 55, 84, 73, 96,
      64, 78, 87, 66, 90, 76,
    ],

    marksDistribution: [
      ['90–100', 31, 'var(--success)'],
      ['80–89', 42, 'var(--accent)'],
      ['70–79', 19, 'var(--primary)'],
      ['Below 70', 8, 'var(--warning)'],
    ],
  },

  'Last term': {
    kpis: {
      enrolledStudents: {
        value: '172',
        trend: '+8 from previous term',
      },
      averageScore: {
        value: '78.1%',
        trend: '+2.9% vs prior term',
      },
      engagementRate: {
        value: '87.6%',
        trend: 'Above department avg.',
      },
      atRiskStudents: {
        value: '9',
        trend: '-1 this month',
      },
    },

    submissionVolume: [
      38, 54, 49, 72, 65, 82,
      58, 69, 76, 61, 81, 70,
    ],

    marksDistribution: [
      ['90–100', 24, 'var(--success)'],
      ['80–89', 39, 'var(--accent)'],
      ['70–79', 24, 'var(--primary)'],
      ['Below 70', 13, 'var(--warning)'],
    ],
  },
};

export function getAnalytics(term = 'This term') {
  return (
    analyticsData[term] ||
    analyticsData['This term']
  );
}

export const analyticsService = {
  get: getAnalytics,
};