import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FullscreenToggle } from '@/components/layout/fullscreen-toggle';

const requestFullscreen = vi.fn().mockResolvedValue(undefined);
const exitFullscreen = vi.fn().mockResolvedValue(undefined);

// jsdom has no fullscreen API on the prototype, so wire the toggler to a
// plain backing field we control.
let fullscreenElement: Element | null = null;

function fireFullscreenChange() {
  fireEvent(document, new Event('fullscreenchange'));
}

describe('FullscreenToggle', () => {
  beforeEach(() => {
    fullscreenElement = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the enter-fullscreen control by default', () => {
    render(<FullscreenToggle />);
    expect(screen.getByText('Enter fullscreen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter fullscreen|exit fullscreen/i })).toBeInTheDocument();
  });

  it('calls requestFullscreen when clicked outside fullscreen', () => {
    render(<FullscreenToggle />);
    fireEvent.click(screen.getByRole('button', { name: /enter fullscreen/i }));
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('calls exitFullscreen when clicked in fullscreen', () => {
    fullscreenElement = document.documentElement;
    render(<FullscreenToggle />);
    fireFullscreenChange();
    expect(screen.getByText('Exit fullscreen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /exit fullscreen/i }));
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('syncs its label to the fullscreenchange event', () => {
    render(<FullscreenToggle />);
    expect(screen.getByText('Enter fullscreen')).toBeInTheDocument();

    fullscreenElement = document.documentElement;
    fireFullscreenChange();
    expect(screen.getByText('Exit fullscreen')).toBeInTheDocument();

    fullscreenElement = null;
    fireFullscreenChange();
    expect(screen.getByText('Enter fullscreen')).toBeInTheDocument();
  });
});