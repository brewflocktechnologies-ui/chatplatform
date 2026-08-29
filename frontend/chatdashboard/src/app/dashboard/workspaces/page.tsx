'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { workspacesInfoContent } from '@/config/infoconfig';

const WORKSPACES = [
  { id: 'demo-org', name: 'Demo Workspace', role: 'Admin', members: 5 }
];

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Manage your workspaces and switch between them'
      infoContent={workspacesInfoContent}
    >
      <div className='grid gap-4 md:grid-cols-2'>
        {WORKSPACES.map((workspace) => (
          <Card key={workspace.id}>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Icons.galleryVerticalEnd className='size-5' />
                {workspace.name}
              </CardTitle>
              <CardDescription>
                {workspace.role} · {workspace.members} members
              </CardDescription>
            </CardHeader>
            <CardContent className='flex gap-2'>
              <Button variant='outline' className='flex-1'>
                Open
              </Button>
              <Button variant='outline' className='flex-1'>
                Settings
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card className='border-dashed'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Icons.add className='size-5' />
              New Workspace
            </CardTitle>
            <CardDescription>Create an additional workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant='outline' className='w-full'>
              Create workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
