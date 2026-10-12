import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createGifIcon } from '@/components/gif-icon/create-gif-icon';
import { IconImage } from '@/components/gif-icon/icon-image';
import { toImgProps } from '@/components/gif-icon/to-img-props';
import { MessageIconGif, TeamIconGif } from '@/components/gif-icon';

describe('toImgProps', () => {
  it('returns the very same props bag', () => {
    const props = { className: 'x', title: 't' };
    expect(toImgProps(props)).toBe(props);
  });
});

describe('IconImage', () => {
  it('renders a decorative image with the given source and merged classes', () => {
    const { container } = render(<IconImage src='/a.svg' className='extra' />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/a.svg');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveClass('size-4', 'object-contain', 'extra');
  });

  it('forwards extra props to the img element', () => {
    const { container } = render(<IconImage src='/a.svg' {...({ 'data-x': '1' } as object)} />);
    expect(container.querySelector('img')).toHaveAttribute('data-x', '1');
  });
});

describe('createGifIcon', () => {
  const Icon = createGifIcon('/anim.gif', '/still.svg');

  it('shows the static image at rest', () => {
    const { container } = render(<Icon className='custom' />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute('src', '/still.svg');
    expect(container.firstChild).toHaveClass('relative', 'inline-flex', 'size-4', 'custom');
  });

  it('swaps in the GIF while the surrounding button is hovered', () => {
    const { container } = render(
      <button data-testid='host'>
        <Icon />
      </button>
    );
    const host = screen.getByTestId('host');
    fireEvent.mouseEnter(host);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveClass('opacity-0');
    expect(imgs[1]).toHaveAttribute('src', '/anim.gif');
    expect(imgs[1]).toHaveClass('absolute', 'inset-0');
    fireEvent.mouseLeave(host);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')).not.toHaveClass('opacity-0');
  });

  it('reacts to hover on the sidebar menu button host as well', () => {
    const { container } = render(
      <div data-sidebar='menu-button' data-testid='host'>
        <Icon />
      </div>
    );
    fireEvent.mouseEnter(screen.getByTestId('host'));
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });
});

describe('exported gif icons', () => {
  it('use their own asset pairs', () => {
    const { container, rerender } = render(<TeamIconGif />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/static-icons/team.svg');
    rerender(<MessageIconGif />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/static-icons/message.svg');
  });
});
