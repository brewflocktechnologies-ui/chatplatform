'use client';

import React, { useState } from 'react';
import { Icons } from '@/components/icons';

interface Contact {
  name: string;
  phone?: string;
  address?: string;
  joinedDate?: string;
  notes?: string;
  status: 'online' | 'offline';
}

interface ContactProfileProps {
  contact: Contact | null;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

const tabs = [
  { id: 'phone', icon: Icons.phone, label: 'Phone' },
  { id: 'address', icon: Icons.mapPin, label: 'Address' },
  { id: 'calendar', icon: Icons.calendar, label: 'Joined' },
  { id: 'info', icon: Icons.info, label: 'More Info' },
];

export default function ContactProfile({ contact, expanded, setExpanded }: ContactProfileProps) {
  const [activeTab, setActiveTab] = useState('phone');

  const renderTabContent = () => {
    if (!contact) return null;
    switch (activeTab) {
      case 'phone':
        return <p>{contact.phone ?? 'No phone number available'}</p>;
      case 'address':
        return <p>{contact.address ?? 'No address provided'}</p>;
      case 'calendar':
        return <p>{contact.joinedDate ?? 'Date not available'}</p>;
      case 'info':
        return <p>{contact.notes ?? 'No additional info'}</p>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Collapsed Mode - Icon Stack */}
      {!expanded && (
        <div className="flex flex-col gap-3 p-1.5 bg-gray-100 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 h-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setExpanded(true);
                }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
                title={tab.label}
              >
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded Mode - Profile Panel */}
      {expanded && (
        <div className="flex flex-col h-full">
          {/* Top header with icons and close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
            <div className="flex gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      isActive ? 'bg-gray-200 dark:bg-gray-700' : ''
                    }`}
                    title={tab.label}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setExpanded(false)} title="Close">
              <Icons.close className="w-5 h-5 text-gray-500 hover:text-red-500" />
            </button>
          </div>

          {/* Profile info */}
          {contact ? (
            <div className="flex flex-col items-center text-center p-6 overflow-y-auto">
              <div
                className="w-20 h-20 rounded-full mb-2 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-200 dark:bg-zinc-700 text-xl font-semibold text-gray-600 dark:text-gray-300"
                aria-hidden
              >
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {contact.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {`${contact.name.toLowerCase().replace(/\s+/g, '')}@example.com`}
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  contact.status === 'online'
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {contact.status}
              </span>
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                {renderTabContent()}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Select a contact to view their profile
            </div>
          )}
        </div>
      )}
    </div>
  );
}