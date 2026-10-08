'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useMockAuth } from '@/features/auth/mock-auth';
import { useUserStatus } from '@/features/auth/user-status';

const Divider = () => <div className='bg-border my-2 h-px' />;

const statusOptions = [
  { label: 'Online', color: 'bg-green-500', value: true },
  { label: 'Offline', color: 'bg-red-500', value: false }
];

export function UserDropdown() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { user, logout } = useMockAuth();
  const { acceptChats, toggleAcceptChats } = useUserStatus();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!resolvedTheme) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type='button'
            aria-haspopup='true'
            aria-label='User menu'
            className={cn(
              'relative cursor-pointer rounded-full p-0',
              isOpen ? 'ring-2 ring-primary' : 'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
          />
        }
      >
        <Avatar className='h-8 w-8 rounded-full'>
          <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
          <AvatarFallback>
            {user?.fullName?.slice(0, 2)?.toUpperCase() || 'zoey'.toUpperCase().slice(0, 2)}
          </AvatarFallback>
          <AvatarBadge
            className={cn(
              'size-3 border-2 border-white',
              acceptChats ? 'bg-green-500' : 'bg-red-500'
            )}
          />
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={cn(
          'w-64 rounded-lg p-2 shadow-xl',
          isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'
        )}
        align='end'
      >
        <DropdownMenuItem className='h-16 focus:bg-transparent'>
          <div className='inline-flex items-center gap-2'>
            <Avatar className='h-10 w-10 rounded-full'>
              <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
              <AvatarFallback>
                {user?.fullName?.slice(0, 2)?.toUpperCase() || 'zoey'.toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className='inline-flex flex-col items-start'>
              <span className={cn('text-base font-bold', isDark ? 'text-white' : 'text-black')}>
                Signed in as
              </span>
              <span
                className={cn('text-sm font-medium', isDark ? 'text-gray-400' : 'text-gray-500')}
              >
                {user?.fullName ?? 'zoey'}
              </span>
            </div>
          </div>
        </DropdownMenuItem>

        <div className='px-1 py-1'>
          <Divider />
        </div>

        <DropdownMenuItem
          className={cn(
            'text-base',
            isDark ? 'text-white hover:bg-zinc-800' : 'text-black hover:bg-gray-100'
          )}
          onClick={() => router.push('/dashboard/profile')}
        >
          My Profile
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={cn('text-base', isDark ? 'text-white' : 'text-black')}>
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn(
              'w-40 rounded-lg p-2 shadow-xl',
              isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'
            )}
          >
            {statusOptions.map(({ label, color, value }) => (
              <DropdownMenuItem
                key={label}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm',
                  isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                )}
                onClick={() => {
                  if (acceptChats !== value) {
                    toggleAcceptChats();
                  }
                }}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <div className='px-1 py-1'>
          <Divider />
        </div>

        <DropdownMenuItem
          onClick={logout}
          className={cn(
            'text-base font-medium text-red-500 hover:bg-gray-100',
            isDark ? 'text-red-400 hover:bg-zinc-800' : 'text-red-500 hover:bg-gray-100'
          )}
        >
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
