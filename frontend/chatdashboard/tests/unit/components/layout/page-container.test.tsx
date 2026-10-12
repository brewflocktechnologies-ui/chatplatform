import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageContainer from '@/components/layout/page-container';

vi.mock('@/components/ui/info-button', () => ({
  InfoButton: ({ content }: { content: { title: string } }) => (
    <button data-testid='info-button'>{content.title}</button>
  )
}));

describe('PageContainer', () => {
  it('renders children without a header when no title or action is given', () => {
    render(
      <PageContainer>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders the title, description and header action', () => {
    render(
      <PageContainer
        pageTitle='Customers'
        pageDescription='All customers'
        pageHeaderAction={<button>New</button>}
      >
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByText('All customers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });

  it('renders a header with only an action (empty title and description)', () => {
    render(
      <PageContainer pageHeaderAction={<button>Go</button>}>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('');
  });

  it('renders only a title without an action wrapper', () => {
    const { container } = render(
      <PageContainer pageTitle='Only title'>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByRole('heading', { name: 'Only title' })).toBeInTheDocument();
    expect(container.querySelector('.shrink-0')).toBeNull();
  });

  it('passes infoContent to the heading', () => {
    render(
      <PageContainer pageTitle='T' infoContent={{ title: 'Help me', sections: [] }}>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByTestId('info-button')).toHaveTextContent('Help me');
  });

  it('shows a loading skeleton instead of children while loading', () => {
    render(
      <PageContainer isLoading>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows the default no-access message', () => {
    render(
      <PageContainer access={false}>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByText('You do not have access to this page.')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows a custom access fallback', () => {
    render(
      <PageContainer access={false} accessFallback={<div>Upgrade required</div>}>
        <p>content</p>
      </PageContainer>
    );
    expect(screen.getByText('Upgrade required')).toBeInTheDocument();
    expect(screen.queryByText('You do not have access to this page.')).not.toBeInTheDocument();
  });
});
