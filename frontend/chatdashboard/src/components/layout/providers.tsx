'use client';
import React from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';
import { MockAuthProvider } from '@/features/auth/mock-auth';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <MockAuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </MockAuthProvider>
      </ActiveThemeProvider>
    </>
  );
}
