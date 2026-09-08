import { delay } from '@/constants/mock-api';
import { PieGraph } from '@/features/overview/components/charts';

export default async function Stats() {
  await delay(1000);
  return <PieGraph />;
}
