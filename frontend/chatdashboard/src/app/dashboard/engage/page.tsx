'use client';

import { useState } from 'react';
import TrafficView from '@/features/engage/TrafficView';
import { cn } from '@/lib/utils';

const TABS = ['traffic', 'campaigns', 'goals'] as const;
type Tab = (typeof TABS)[number];

export default function EngagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('traffic');

  return (
    <div className='bg-background text-foreground flex h-[calc(100dvh-4rem)] w-0 min-w-full flex-1 flex-col overflow-hidden md:h-[calc(100dvh-3.5rem)] md:flex-row'>
      {/* Tab navigation: horizontal scroller on phones, side rail from md up */}
      <div className='border-border/60 bg-muted/30 shrink-0 border-b p-3 md:w-52 md:border-r md:border-b-0 md:p-4 lg:w-56'>
        <h2 className='mb-3 text-xl font-semibold max-md:sr-only'>Engage</h2>
        <nav
          aria-label='Engage sections'
          className='flex gap-1.5 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible'
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type='button'
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={cn(
                'focus-visible:ring-ring shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-2',
                activeTab === tab
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Right content view */}
      <div className='flex h-full min-h-0 min-w-0 flex-1 flex-col'>
        {activeTab === 'traffic' && <TrafficView />}
        {activeTab === 'campaigns' && <CampaignsView />}
        {activeTab === 'goals' && <GoalsView />}
      </div>
    </div>
  );
}

function CampaignsView() {
  return <div className='p-4 text-lg font-bold sm:p-6 sm:text-xl'>🎯 Marketing Campaigns</div>;
}

function GoalsView() {
  return <div className='p-4 text-lg font-bold sm:p-6 sm:text-xl'>🏁 Engagement Goals</div>;
}
