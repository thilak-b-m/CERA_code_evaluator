import { faculty } from '../data/facultyMockData.js';
export const facultyService = { getProfile: async () => faculty, updateProfile: async profile => ({ ...faculty, ...profile }) };