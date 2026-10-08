'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useCustomerStore, type Customer } from './useCustomerStore';
import { Icons } from '@/components/icons';
import ContactProfile from './ContactProfile';

export default function TrafficView() {
    const { customerData } = useCustomerStore();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [profileExpanded, setProfileExpanded] = useState(false);

    const filters = [
        { label: 'All Customers', count: customerData.length },
        { label: 'Chatting', count: customerData.filter(c => c.activity === 'Chatting').length },
        { label: 'Supervised', count: customerData.filter(c => c.activity === 'Supervised').length },
        { label: 'Queued', count: customerData.filter(c => c.activity === 'Queued').length },
        { label: 'Waiting for Reply', count: customerData.filter(c => c.activity === 'Waiting for reply').length },
        { label: 'Invited', count: customerData.filter(c => c.activity === 'Invited').length },
        { label: 'Browsing', count: customerData.filter(c => c.activity === 'Browsing').length },
    ];

    const [selectedFilter, setSelectedFilter] = useState<string>('All Customers');

    const filteredData =
        selectedFilter === 'All Customers'
            ? customerData
            : customerData.filter((u) => u.activity.toLowerCase() === selectedFilter.toLowerCase());

    return (
        <div className="flex h-full min-h-0 border border-gray-300 bg-white text-black transition-colors dark:border-gray-700 dark:bg-zinc-900 dark:text-white">
            {/* Main Content - full width when profile collapsed, 70% when expanded */}
            <div
                className={clsx(
                    'min-w-0 p-6 overflow-y-auto transition-all duration-300',
                    profileExpanded ? 'w-[70%]' : 'w-full'
                )}
            >
                <div className="space-y-6">
                    {/* Heading */}
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">📊 Traffic Insights</h1>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-6 border-b border-gray-200 dark:border-zinc-700">
                        {filters.map((filter) => (
                            <button
                                key={filter.label}
                                onClick={() => setSelectedFilter(filter.label)}
                                className={clsx(
                                    'pb-2 text-sm font-medium capitalize transition-colors border-b-2',
                                    selectedFilter === filter.label
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-600 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:border-blue-400'
                                )}
                            >
                                {filter.label} ({filter.count})
                            </button>
                        ))}
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-3 py-1.5 border text-sm rounded-md bg-white hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-600">
                                <Icons.filter className="w-4 h-4" />
                                Match all filters
                            </button>
                        </div>
                        <button className="flex items-center gap-2 px-3 py-1.5 border text-sm rounded-md bg-white hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-600">
                            <Icons.adjustments className="w-4 h-4" />
                            Activity
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 border text-sm rounded-md bg-white hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-600">
                            <Icons.add className="w-4 h-4" />
                            Add Filter
                        </button>
                    </div>

                    {/* Data Table */}
                    <div className="p-6 border rounded-md bg-white dark:bg-zinc-900 dark:border-zinc-700">
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            Showing data for: <strong>{selectedFilter}</strong>
                        </p>
                        <table className="w-full mt-2 text-sm text-left text-gray-700 dark:text-gray-300">
                            <thead className="border-b border-t border-gray-300 dark:border-zinc-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="py-2 pr-4">Name</th>
                                    <th className="py-2 pr-4">Group</th>
                                    <th className="py-2 pr-4">Activity</th>
                                    <th className="py-2 pr-4">Chatting With</th>
                                    <th className="py-2 pr-4">Country</th>
                                    <th className="py-2 pr-4">State</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((user, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => {
                                            setSelectedCustomer(user);
                                            setProfileExpanded(true);
                                        }}
                                        className={clsx(
                                            'border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer',
                                            selectedCustomer === user && 'bg-gray-100 dark:bg-zinc-800'
                                        )}
                                    >
                                        <td className="py-2 pr-4">{user.name}</td>
                                        <td className="py-2 pr-4">{user.group}</td>
                                        <td className="py-2 pr-4">{user.activity}</td>
                                        <td className="py-2 pr-4">{user.chattingWith || '-'}</td>
                                        <td className="py-2 pr-4">{user.country}</td>
                                        <td className="py-2 pr-4">{user.state}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Contact Profile, 30% when open, narrow rail when collapsed */}
            <div
                className={clsx(
                    'h-full transition-all duration-300 border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 shadow-lg',
                    profileExpanded ? 'w-[30%]' : 'w-12'
                )}
            >
                <ContactProfile
                    contact={
                        selectedCustomer
                            ? {
                                ...selectedCustomer,
                                status:
                                    selectedCustomer.status === 'online'
                                        ? 'online'
                                        : 'offline',
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