import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const { login, toastSuccess } = vi.hoisted(() => ({ login: vi.fn(), toastSuccess: vi.fn() }));

vi.mock('@/features/auth/mock-auth', () => ({ useMockAuth: () => ({ login }) }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess } }));
vi.mock('next/image', () => ({
  default: ({
    priority: _p,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  )
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

import GithubSignInButton from '@/features/auth/components/github-auth-button';
import { InteractiveGridPattern } from '@/features/auth/components/interactive-grid';
import MockLoginForm from '@/features/auth/components/mock-login-form';
import SignInViewPage, { metadata as signInMeta } from '@/features/auth/components/sign-in-view';
import SignUpViewPage, { metadata as signUpMeta } from '@/features/auth/components/sign-up-view';
import UserAuthForm from '@/features/auth/components/user-auth-form';

afterEach(() => {
  cleanup();
  login.mockReset();
  toastSuccess.mockReset();
});

describe('GithubSignInButton', () => {
  it('renders and is clickable', () => {
    render(<GithubSignInButton />);
    const btn = screen.getByRole('button', { name: /continue with github/i });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('type', 'button');
  });
});

describe('InteractiveGridPattern', () => {
  it('renders squares and tracks hover state', () => {
    const { container } = render(
      <InteractiveGridPattern
        squares={[2, 3]}
        width={10}
        height={20}
        className='x'
        squaresClassName='sq'
      />
    );
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '60');
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(6);
    expect(rects[3]).toHaveAttribute('x', '10');
    expect(rects[3]).toHaveAttribute('y', '20');
    fireEvent.mouseEnter(rects[1]);
    expect(rects[1].getAttribute('class')).toContain('fill-gray-300/30');
    fireEvent.mouseLeave(rects[1]);
    expect(rects[1].getAttribute('class')).toContain('fill-transparent');
  });

  it('uses default size', () => {
    const { container } = render(<InteractiveGridPattern />);
    expect(container.querySelectorAll('rect')).toHaveLength(576);
  });
});

describe('MockLoginForm', () => {
  it('logs in with the entered name', async () => {
    render(<MockLoginForm />);
    const input = screen.getByPlaceholderText('Your name');
    expect(input).toHaveValue('Demo User');
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /login \(demo\)/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('Alice'));
  });

  it('does not log in when name is empty', async () => {
    render(<MockLoginForm />);
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /login \(demo\)/i }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});

describe('Sign in / sign up views', () => {
  it('SignInViewPage renders form and images', () => {
    render(<SignInViewPage />);
    expect(signInMeta.title).toBe('Authentication');
    expect(screen.getByAltText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('SignUpViewPage renders form and images', () => {
    render(<SignUpViewPage />);
    expect(signUpMeta.title).toBe('Authentication');
    expect(screen.getByAltText('Sign-up')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });
});

describe('UserAuthForm', () => {
  it('shows validation error for invalid email', async () => {
    render(<UserAuthForm />);
    const input = screen.getByPlaceholderText('Enter your email...');
    fireEvent.change(input, { target: { value: 'nope' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('toasts on valid submit', async () => {
    render(<UserAuthForm />);
    fireEvent.change(screen.getByPlaceholderText('Enter your email...'), {
      target: { value: 'a@b.co' }
    });
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Signed In Successfully!'));
    expect(screen.getByText('Continue with Github')).toBeInTheDocument();
  });
});
