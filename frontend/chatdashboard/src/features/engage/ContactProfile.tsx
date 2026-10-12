'use client';

import React, { useState } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

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
  { id: 'info', icon: Icons.info, label: 'More Info' }
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
    <div className='bg-card text-card-foreground flex h-full flex-col'>
      {/* Collapsed mode: icon rail */}
      {!expanded && (
        <div className='bg-muted/40 flex h-full flex-col items-center gap-2 p-1.5'>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type='button'
                onClick={() => {
                  setActiveTab(tab.id);
                  setExpanded(true);
                }}
                className='hover:bg-accent rounded-md p-1.5 transition-colors'
                title={tab.label}
              >
                <Icon className='text-muted-foreground h-5 w-5' />
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded mode: profile panel */}
      {expanded && (
        <div className='flex h-full min-h-0 flex-col'>
          {/* Top header with tab icons and close button */}
          <div className='border-border/60 flex items-center justify-between border-b px-4 py-3'>
            <div className='flex gap-2'>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'hover:bg-accent rounded-md p-1.5 transition-colors',
                      isActive && 'bg-primary/10'
                    )}
                    title={tab.label}
                  >
                    <Icon
                      className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')}
                    />
                  </button>
                );
              })}
            </div>
            <button
              type='button'
              onClick={() => setExpanded(false)}
              title='Close'
              className='hover:bg-accent rounded-md p-1.5 transition-colors'
            >
              <Icons.close className='text-muted-foreground hover:text-destructive h-5 w-5' />
            </button>
          </div>

          {/* Profile info */}
          {contact ? (
            <div className='flex flex-col items-center overflow-y-auto p-6 text-center'>
              <div
                className='border-primary/30 bg-primary/10 text-primary mb-2 flex h-20 w-20 items-center justify-center rounded-full border-2 text-xl font-semibold'
                aria-hidden
              >
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <h2 className='text-lg font-semibold'>{contact.name}</h2>
              <p className='text-muted-foreground text-sm break-all'>
                {`${contact.name.toLowerCase().replace(/\s+/g, '')}@example.com`}
              </p>
              <span
                className={cn(
                  'mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium',
                  contact.status === 'online'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {contact.status}
              </span>
              <div className='mt-4 text-sm'>{renderTabContent()}</div>
            </div>
          ) : (
            <div className='text-muted-foreground p-6 text-center text-sm'>
              Select a contact to view their profile
            </div>
          )}
        </div>
      )}
    </div>
  );
}
