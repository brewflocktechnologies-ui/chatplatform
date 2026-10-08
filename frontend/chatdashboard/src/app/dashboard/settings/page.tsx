'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSelector } from '@/components/themes/theme-selector';

export default function SettingsPage() {
  return (
    <PageContainer pageTitle='Settings'>
      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Pick the theme used across the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
