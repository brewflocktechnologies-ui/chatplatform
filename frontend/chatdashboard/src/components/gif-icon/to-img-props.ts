import type { IconProps } from '@tabler/icons-react';
import type { ImgHTMLAttributes } from 'react';

/**
 * `IconProps` describes an <svg> component's props (event handlers typed
 * for SVGSVGElement). These icons render an <img>, so the bag is only
 * structurally compatible with ImgHTMLAttributes, not nominally — safe to
 * forward at runtime, but needs a cast to satisfy the DOM element types.
 */
export function toImgProps(
  props: Omit<IconProps, 'ref'>,
): ImgHTMLAttributes<HTMLImageElement> {
  return props as ImgHTMLAttributes<HTMLImageElement>;
}
