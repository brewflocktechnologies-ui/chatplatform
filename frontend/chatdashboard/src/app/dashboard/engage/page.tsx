'use client';

import { useState } from 'react';
import clsx from 'clsx';
import TrafficView from '@/features/engage/TrafficView';

export default function EngagePage() {
  const [activeTab, setActiveTab] = useState<'traffic' | 'campaigns' | 'goals'>('traffic');

  return (
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden md:h-[calc(100dvh-3.5rem)]">
      {/* Left Sidebar */}
      <div className="w-[220px] border-r p-4 bg-gray-50 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Engage</h2>
        <nav className="flex flex-col gap-2">
          {['traffic', 'campaigns', 'goals'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={clsx(
                'text-left px-3 py-2 rounded-md text-sm font-medium capitalize',
                {
                  'bg-blue-100 text-blue-900 dark:bg-blue-800 dark:text-white':
                    activeTab === tab,
                  'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800':
                    activeTab !== tab,
                }
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Content View */}
      <div className="flex-1">
        {activeTab === 'traffic' && <TrafficView />}
        {activeTab === 'campaigns' && <CampaignsView />}
        {activeTab === 'goals' && <GoalsView />}
      </div>
    </div>
  );
}



function CampaignsView() {
  return <div className="text-xl font-bold">🎯 Marketing Campaigns</div>;
}

function GoalsView() {
  return <div className="text-xl font-bold">🏁 Engagement Goals</div>;
}
