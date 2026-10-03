import type { Metadata } from 'next';
import { DinnerClient } from './DinnerClient';

export const metadata: Metadata = {
  title: 'SocialCoach · 3D',
  description: '走进饭桌、电梯口与办公室，练习在压力下开口。Step into a dinner, elevator lobby or office and practise your response under pressure.',
};

export default function DinnerPage() { return <DinnerClient />; }
