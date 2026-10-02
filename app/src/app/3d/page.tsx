import type { Metadata } from 'next';
import { DinnerClient } from './DinnerClient';

export const metadata: Metadata = {
  title: 'SocialCoach · 3D',
  description: '坐进职场、家庭与学校的饭桌，练习在压力下开口。A seat at a fictional dinner table, and a chance to practise your response.',
};

export default function DinnerPage() { return <DinnerClient />; }
