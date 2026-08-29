'use client';

import { Icons } from '@/components/icons';
import { useRouter } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

const WORKSPACES = [{ id: 'demo-org', name: 'Demo Workspace' }];

export function OrgSwitcher() {
  const { isMobile, state } = useSidebar();
  const router = useRouter();
  const activeOrganization = WORKSPACES[0];

  return (
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
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
              <Icons.galleryVerticalEnd className='size-4' />
            </div>
            <div
              className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 overflow-hidden opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            >
              <span className='truncate font-medium'>{activeOrganization.name}</span>
              <span className='text-muted-foreground truncate text-xs'>Organization</span>
            </div>
            <Icons.chevronsUpDown
              className={`ml-auto transition-all duration-200 ease-in-out ${
                state === 'collapsed'
                  ? 'invisible max-w-0 opacity-0'
                  : 'visible max-w-full opacity-100'
              }`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--anchor-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className='text-muted-foreground text-xs'>
                Organizations
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              {WORKSPACES.map((workspace, index) => {
                const isActive = workspace.id === activeOrganization.id;
                return (
                  <DropdownMenuItem
                    key={workspace.id}
                    className='gap-2 p-2'
                    onClick={() => router.push('/dashboard/workspaces')}
                  >
                    <div className='flex size-6 items-center justify-center overflow-hidden rounded-md border'>
                      <Icons.galleryVerticalEnd className='size-3.5 shrink-0' />
                    </div>
                    {workspace.name}
                    {isActive && <Icons.check className='ml-auto size-4' />}
                    {!isActive && <span className='ml-auto text-muted-foreground text-xs'>⌘{index + 1}</span>}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className='gap-2 p-2'
                onClick={() => {
                  router.push('/dashboard/workspaces');
                }}
              >
                <div className='flex size-6 items-center justify-center rounded-md border bg-transparent'>
                  <Icons.add className='size-4' />
                </div>
                <div className='text-muted-foreground font-medium'>Add organization</div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
