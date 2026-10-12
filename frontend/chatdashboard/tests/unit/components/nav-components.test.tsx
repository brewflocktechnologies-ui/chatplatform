import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import FormCardSkeleton from '@/components/form-card-skeleton';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';

afterEach(cleanup);

const wrap = (ui: React.ReactNode) => render(<SidebarProvider>{ui}</SidebarProvider>);

describe('NavMain', () => {
  const items = [
    {
      title: 'Products',
      url: '/p',
      icon: Icons.product,
      isActive: true,
      items: [{ title: 'All products', url: '/p/all' }]
    },
    { title: 'Plain', url: '/plain' }
  ];

  it('renders groups, icons and sub links; open when active', () => {
    wrap(<NavMain items={items} />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All products' })).toHaveAttribute('href', '/p/all');
    expect(screen.getByText('Plain')).toBeInTheDocument();
  });

  it('toggles a collapsed group', () => {
    wrap(<NavMain items={[{ ...items[0], isActive: false }]} />);
    expect(screen.queryByRole('link', { name: 'All products' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Products'));
    expect(screen.getByRole('link', { name: 'All products' })).toBeInTheDocument();
  });
});

describe('NavProjects', () => {
  it('shows the empty state', () => {
    wrap(<NavProjects projects={[]} />);
    expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
  });

  it('lists projects as links and opens the actions menu', async () => {
    wrap(<NavProjects projects={[{ name: 'Alpha', url: '/alpha', icon: Icons.workspace }]} />);
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/alpha');
    fireEvent.click(screen.getAllByRole('button', { name: 'More' })[0]);
    expect(await screen.findByText('View Project')).toBeInTheDocument();
    expect(screen.getByText('Share Project')).toBeInTheDocument();
    expect(screen.getByText('Delete Project')).toBeInTheDocument();
  });
});

describe('NavUser', () => {
  it('shows the user and the account menu', async () => {
    wrap(<NavUser user={{ name: 'Zoey', email: 'z@mail.com', avatar: '' }} />);
    expect(screen.getByText('Zoey')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zoey/ }));
    for (const label of ['Upgrade to Pro', 'Account', 'Billing', 'Notifications', 'Log out']) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });
});

describe('FormCardSkeleton', () => {
  it('renders placeholder blocks', () => {
    const { container } = render(<FormCardSkeleton />);
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
