'use client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useUserStatus } from '@/features/auth/user-status';
import { navGroups } from '@/config/nav-config';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useMockAuth } from '@/features/auth/mock-auth';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';
import { OrgSwitcher } from '../org-switcher';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const { user, logout } = useMockAuth();
  const router = useRouter();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const { acceptChats, toggleAcceptChats } = useUserStatus();
  const { resolvedTheme, setTheme } = useTheme();

  const statusBadgeClass = cn(
    'size-3 rounded-full ring-2 ring-background',
    acceptChats ? 'bg-green-500' : 'bg-red-500'
  );

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-0'>
            {group.label && (
              <SidebarGroupLabel>
                <span className='truncate text-left transition-opacity duration-150 ease-linear group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none'>
                  {group.label}
                </span>
                <div
                  aria-hidden='true'
                  className='pointer-events-none absolute left-0 top-0 flex h-8 w-8 items-center justify-center opacity-0 transition-opacity duration-150 ease-linear group-data-[collapsible=icon]:opacity-100'
                >
                  <span className='h-px w-5 rounded-full bg-sidebar-border' />
                </div>
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return item?.items && item?.items?.length > 0 ? (
                  <Collapsible
                    key={item.title}
                    defaultOpen={item.isActive}
                    render={<SidebarMenuItem />}
                  >
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={pathname === item.url}
                          className='group/collapsible'
                        />
                      }
                    >
                      {item.icon && <Icon />}
                      <span>{item.title}</span>
                      <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90 group-data-[collapsible=icon]:hidden' />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              render={<Link href={subItem.url} aria-label={subItem.title} />}
                              isActive={pathname === subItem.url}
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size='lg'
                    className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
                  />
                }
              >
                {user && (
                  <UserAvatarProfile
                    className='h-8 w-8 rounded-lg'
                    showInfo
                    badgeClassName={statusBadgeClass}
                    user={{
                      imageUrl: user.imageUrl,
                      fullName: user.fullName,
                      emailAddresses: [{ emailAddress: user.email }]
                    }}
                  />
                )}
                <Icons.chevronsDown className='ml-auto size-4  shrink-0 transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none' />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--anchor-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className='p-0 font-normal'>
                    <div className='px-1 py-1.5'>
                      {user && (
                        <UserAvatarProfile
                          className='h-8 w-8 rounded-lg'
                          showInfo
                          badgeClassName={statusBadgeClass}
                          user={{
                            imageUrl: user.imageUrl,
                            fullName: user.fullName,
                            emailAddresses: [{ emailAddress: user.email }]
                          }}
                        />
                      )}
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    closeOnClick={false}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2'>
                      <Icons.chat className='h-4 w-4' />
                      <span>Accept chats</span>
                    </div>
                    <Switch
                      size='sm'
                      checked={acceptChats}
                      onCheckedChange={toggleAcceptChats}
                      className='data-checked:bg-green-500'
                      aria-label='Accept chats'
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    closeOnClick={false}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2'>
                      <Icons.moon className='h-4 w-4' />
                      <span>Dark mode</span>
                    </div>
                    <Switch
                      size='sm'
                      checked={resolvedTheme === 'dark'}
                      onCheckedChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className='data-checked:bg-blue-500'
                      aria-label='Dark mode'
                    />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                    <Icons.settings className='mr-2 h-4 w-4' />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                    <Icons.account className='mr-2 h-4 w-4' />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/billing')}>
                    <Icons.creditCard className='mr-2 h-4 w-4' />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>
                    <Icons.notification className='mr-2 h-4 w-4' />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => logout()}>
                    <Icons.logout aria-hidden className='mr-2 h-4 w-4' />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
