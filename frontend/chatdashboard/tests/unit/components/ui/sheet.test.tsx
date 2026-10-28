import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

afterEach(cleanup);

function renderSheet(props: Partial<React.ComponentProps<typeof Sheet>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <Sheet open onOpenChange={onOpenChange} {...props}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit</SheetTitle>
          <SheetDescription>Form</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
  return onOpenChange;
}

const backdrop = () => document.querySelector('[data-slot="sheet-overlay"]') as HTMLElement;

describe('Sheet', () => {
  it('stays open when the backdrop is clicked', () => {
    const onOpenChange = renderSheet();
    fireEvent.pointerDown(backdrop());
    fireEvent.click(backdrop());
    expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('still closes with Escape', () => {
    const onOpenChange = renderSheet();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('renders a centered modal when side is center', () => {
    render(
      <Sheet open>
        <SheetContent side='center'>
          <SheetHeader>
            <SheetTitle>Edit</SheetTitle>
            <SheetDescription>Form</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-side', 'center');
  });

  it('can opt back in to closing on outside click', () => {
    const onOpenChange = renderSheet({ disablePointerDismissal: false });
    fireEvent.pointerDown(backdrop());
    fireEvent.click(backdrop());
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
