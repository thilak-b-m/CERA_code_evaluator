import { useEffect, useState } from 'react';
import { liveLabSessions } from '../data/liveLabMockData.js';
export default function useLiveLabSocket() { const [sessions, setSessions] = useState(liveLabSessions); useEffect(() => { const timer = setInterval(() => setSessions(current => [...current]), 8000); return () => clearInterval(timer); }, []); return { sessions, connected: true }; }