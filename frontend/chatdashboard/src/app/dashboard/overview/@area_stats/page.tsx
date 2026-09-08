import { delay } from '@/constants/mock-api';
import { AreaGraph } from '@/features/overview/components/charts';

export default async function AreaStats() {
  await delay(2000);
  return <AreaGraph />;
}
