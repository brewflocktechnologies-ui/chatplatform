import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider, useInfobar, type InfobarContent } from '@/components/ui/infobar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/overview'
}));

afterEach(cleanup);

function SetContent({ content }: { content: InfobarContent | null }) {
  const { setContent } = useInfobar();
  React.useEffect(() => {
    setContent(content);
  }, [content, setContent]);
  return null;
}

function renderSidebar(content: InfobarContent | null) {
  return render(
    <InfobarProvider>
      <SetContent content={content} />
      <InfoSidebar />
    </InfobarProvider>
  );
}

describe('InfoSidebar', () => {
  it('shows the default documentation content when none is set', () => {
    renderSidebar(null);
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Learn how to get started with this application.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Installation Guide/ });
    expect(link).toHaveAttribute('href', '#');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  it('renders custom title, sections and links', () => {
    renderSidebar({
      title: 'Customers help',
      sections: [
        {
          title: 'Filtering',
          description: 'Use filters to narrow the list.',
          links: [
            { title: 'Docs', url: 'https://example.com/docs' },
            { title: 'FAQ', url: 'https://example.com/faq' }
          ]
        },
        { title: 'Exporting', description: 'Download CSV.' }
      ]
    });
    expect(screen.getByRole('heading', { name: 'Customers help' })).toBeInTheDocument();
    expect(screen.getByText('Filtering')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /FAQ/ })).toHaveAttribute(
      'href',
      'https://example.com/faq'
    );
    expect(screen.getByText('Exporting')).toBeInTheDocument();
    // only the section with links shows the "Learn more" heading
    expect(screen.getAllByText('Learn more')).toHaveLength(1);
  });

  it('omits empty titles, descriptions and empty link lists', () => {
    renderSidebar({
      title: 'Sparse',
      sections: [{ title: '', description: '', links: [] }]
    });
    expect(screen.queryByText('Learn more')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no sections', () => {
    renderSidebar({ title: 'Empty', sections: [] });
    expect(screen.getByText('No content available')).toBeInTheDocument();
  });
});
