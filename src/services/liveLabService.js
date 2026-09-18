import { getLiveLabData } from '../data/facultyMockData.js';

export const liveLabService = {
  getOverview: () => getLiveLabData(),
};