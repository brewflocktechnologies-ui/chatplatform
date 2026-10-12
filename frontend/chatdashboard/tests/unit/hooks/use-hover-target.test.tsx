import { describe, expect, it } from 'vitest';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useHoverTarget } from '@/hooks/use-hover-target';

function Probe({ selector }: { selector?: string }) {
  const { ref, hovered } = useHoverTarget<HTMLSpanElement>(selector);
  return (
    <span ref={ref} data-testid='probe'>
      {hovered ? 'hovered' : 'idle'}
    </span>
  );
}

describe('useHoverTarget', () => {
  it('tracks hover on the element itself without a selector', () => {
    render(<Probe />);
    const el = screen.getByTestId('probe');
    expect(el).toHaveTextContent('idle');
    fireEvent.mouseEnter(el);
    expect(el).toHaveTextContent('hovered');
    fireEvent.mouseLeave(el);
    expect(el).toHaveTextContent('idle');
  });

  it('tracks hover on the closest matching ancestor', () => {
    render(
      <button data-testid='host'>
        <Probe selector='button' />
      </button>
    );
    const host = screen.getByTestId('host');
    fireEvent.mouseEnter(host);
    expect(screen.getByTestId('probe')).toHaveTextContent('hovered');
    fireEvent.mouseLeave(host);
    expect(screen.getByTestId('probe')).toHaveTextContent('idle');
  });

  it('falls back to the element when no ancestor matches', () => {
    render(<Probe selector='a' />);
    const el = screen.getByTestId('probe');
    fireEvent.mouseEnter(el);
    expect(el).toHaveTextContent('hovered');
  });

  it('is inert when the ref is never attached', () => {
    const { result } = renderHook(() => useHoverTarget());
    expect(result.current.hovered).toBe(false);
  });

  it('removes its listeners on unmount', () => {
    const { unmount } = render(<Probe />);
    const el = screen.getByTestId('probe');
    unmount();
    expect(() => fireEvent.mouseEnter(el)).not.toThrow();
  });
});
