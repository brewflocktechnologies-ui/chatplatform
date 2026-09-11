import { cn } from '@/lib/utils';
import type { IconProps } from '@tabler/icons-react';
import { toImgProps } from './to-img-props';

type IconImageProps = Omit<IconProps, 'ref'> & {
  src: string;
};

/** Renders a single icon frame (static SVG or GIF) as an `<img>`. */
export function IconImage({ src, className, ...props }: IconImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      {...toImgProps(props)}
      className={cn('size-4 object-contain', className)}
    />
  );
}
