'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { teamInfoContent } from '@/config/infoconfig';

const MEMBERS = [
  { name: 'Demo User', email: 'demo@example.com', role: 'Admin' },
  { name: 'Alice Smith', email: 'alice@example.com', role: 'Member' },
  { name: 'Bob Jones', email: 'bob@example.com', role: 'Member' }
];

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Manage your workspace team, members, roles, security and more.'
      infoContent={teamInfoContent}
    >
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {MEMBERS.map((member) => (
            <div
              key={member.email}
              className='flex items-center gap-3 rounded-lg border p-3'
            >
              <Avatar>
                <AvatarFallback>
                  {member.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <p className='text-sm font-medium'>{member.name}</p>
                <p className='text-muted-foreground text-xs'>{member.email}</p>
              </div>
              <span className='text-muted-foreground text-xs'>{member.role}</span>
              <Icons.dots className='text-muted-foreground size-4' />
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
