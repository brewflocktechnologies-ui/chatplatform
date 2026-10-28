'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useCustomerStore, type Customer } from './useCustomerStore';
import { Icons } from '@/components/icons';
import ContactProfile from './ContactProfile';

const CONTROLS = [
  { label: 'Match all filters', icon: Icons.filter },
  { label: 'Activity', icon: Icons.adjustments },
  { label: 'Add Filter', icon: Icons.add }
];

export default function TrafficView() {
  const { customerData } = useCustomerStore();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);

  const filters = [
    { label: 'All Customers', count: customerData.length },
    { label: 'Chatting', count: customerData.filter((c) => c.activity === 'Chatting').length },
    { label: 'Supervised', count: customerData.filter((c) => c.activity === 'Supervised').length },
    { label: 'Queued', count: customerData.filter((c) => c.activity === 'Queued').length },
    {
      label: 'Waiting for Reply',
      count: customerData.filter((c) => c.activity === 'Waiting for reply').length
    },
    { label: 'Invited', count: customerData.filter((c) => c.activity === 'Invited').length },
    { label: 'Browsing', count: customerData.filter((c) => c.activity === 'Browsing').length }
  ];

  const [selectedFilter, setSelectedFilter] = useState<string>('All Customers');

  const filteredData =
    selectedFilter === 'All Customers'
      ? customerData
      : customerData.filter((u) => u.activity.toLowerCase() === selectedFilter.toLowerCase());

  return (
    <div className='bg-background text-foreground relative flex h-full min-h-0'>
      {/* Main content */}
      <div className='min-w-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        <div className='space-y-5 sm:space-y-6'>
          <h1 className='text-xl font-semibold sm:text-2xl'>📊 Traffic Insights</h1>

          {/* Filter tabs: scroll sideways on small screens instead of wrapping into a tall block */}
          <div className='border-border/60 -mx-4 flex gap-5 overflow-x-auto border-b px-4 sm:mx-0 sm:flex-wrap sm:gap-6 sm:px-0'>
            {filters.map((filter) => (
              <button
                key={filter.label}
                type='button'
                onClick={() => setSelectedFilter(filter.label)}
                className={cn(
                  'shrink-0 border-b-2 pb-2 text-sm font-medium whitespace-nowrap capitalize transition-colors',
                  selectedFilter === filter.label
                    ? 'border-primary text-primary'
                    : 'text-muted-foreground hover:border-primary/50 hover:text-primary border-transparent'
                )}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          {/* Filter controls */}
          <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
            {CONTROLS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type='button'
                className='border-border bg-card hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors'
              >
                <Icon className='h-4 w-4' />
                {label}
              </button>
            ))}
          </div>

          {/* Data table */}
          <div className='border-border bg-card rounded-lg border p-3 sm:p-6'>
            <p className='text-muted-foreground mb-3 text-sm sm:mb-4'>
              Showing data for: <strong className='text-foreground'>{selectedFilter}</strong>
            </p>
            <div className='overflow-x-auto'>
              <table className='mt-2 w-full min-w-[640px] text-left text-sm'>
                <thead className='border-border text-muted-foreground border-y text-xs uppercase'>
                  <tr>
                    <th className='py-2 pr-4'>Name</th>
                    <th className='py-2 pr-4'>Group</th>
                    <th className='py-2 pr-4'>Activity</th>
                    <th className='py-2 pr-4'>Chatting With</th>
                    <th className='py-2 pr-4'>Country</th>
                    <th className='py-2 pr-4'>State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((user) => (
                    <tr
                      key={`${user.name}-${user.group}`}
                      onClick={() => {
                        setSelectedCustomer(user);
                        setProfileExpanded(true);
                      }}
                      className={cn(
                        'border-border/60 hover:bg-accent/50 cursor-pointer border-b transition-colors',
                        selectedCustomer === user && 'bg-primary/5'
                      )}
                    >
                      <td className='py-2 pr-4'>{user.name}</td>
                      <td className='py-2 pr-4'>{user.group}</td>
                      <td className='py-2 pr-4'>{user.activity}</td>
                      <td className='py-2 pr-4'>{user.chattingWith || '-'}</td>
                      <td className='py-2 pr-4'>{user.country}</td>
                      <td className='py-2 pr-4'>{user.state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Contact profile: overlay below lg; docked panel (icon rail when collapsed) from lg up */}
      <div
        className={cn(
          'border-border/60 bg-card border-l transition-all duration-300',
          profileExpanded
            ? 'absolute inset-y-0 right-0 z-20 w-full max-w-sm shadow-xl sm:w-80 lg:static lg:z-auto lg:w-80 lg:max-w-none lg:shadow-none xl:w-96'
            : 'hidden lg:block lg:w-12'
        )}
      >
        <ContactProfile
          contact={
            selectedCustomer
              ? {
                  ...selectedCustomer,
                  status: selectedCustomer.status === 'online' ? 'online' : 'offline'
                }
              : null
          }
          expanded={profileExpanded}
          setExpanded={setProfileExpanded}
        />
      </div>
    </div>
  );
}
