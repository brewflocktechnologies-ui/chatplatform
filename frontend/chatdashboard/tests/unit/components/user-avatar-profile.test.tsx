import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatarProfile } from '@/components/user-avatar-profile';

const user = {
  imageUrl: '',
  fullName: 'Demo User',
  emailAddresses: [{ emailAddress: 'demo@example.com' }]
};

describe('UserAvatarProfile', () => {
  it('shows the first two initials as the avatar fallback', () => {
    render(<UserAvatarProfile user={user} />);
    expect(screen.getByText('DE')).toBeInTheDocument();
  });

  it('falls back to CN when there is no user', () => {
    render(<UserAvatarProfile user={null} />);
    expect(screen.getByText('CN')).toBeInTheDocument();
  });

  it('hides name and email by default', () => {
    render(<UserAvatarProfile user={user} />);
    expect(screen.queryByText('Demo User')).not.toBeInTheDocument();
    expect(screen.queryByText('demo@example.com')).not.toBeInTheDocument();
  });

  it('shows name and email when showInfo is set', () => {
    render(<UserAvatarProfile user={user} showInfo />);
    expect(screen.getByText('Demo User')).toBeInTheDocument();
    expect(screen.getByText('demo@example.com')).toBeInTheDocument();
  });

  it('renders a status badge with the given class', () => {
    const { container } = render(
      <UserAvatarProfile user={user} badgeClassName='bg-green-500' />
    );
    const badge = container.querySelector('.bg-green-500');
    expect(badge).toBeInTheDocument();
  });

  it('renders no badge by default', () => {
    const { container } = render(<UserAvatarProfile user={user} />);
    expect(container.querySelector('.bg-green-500')).not.toBeInTheDocument();
  });
});
