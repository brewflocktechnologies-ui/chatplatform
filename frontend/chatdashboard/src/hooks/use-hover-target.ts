'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tracks hover state on the element itself, or on the nearest ancestor
 * matching `closestSelector` (e.g. a surrounding sidebar menu button/link),
 * so hover-driven UI reacts together with that ancestor's hover state.
 */
export function useHoverTarget<T extends HTMLElement>(
  closestSelector?: string,
) {
  const ref = useRef<T>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const host = closestSelector ? (el.closest(closestSelector) ?? el) : el;

    const on = () => setHovered(true);
    const off = () => setHovered(false);

    host.addEventListener('mouseenter', on);
    host.addEventListener('mouseleave', off);

    return () => {
      host.removeEventListener('mouseenter', on);
      host.removeEventListener('mouseleave', off);
    };
  }, [closestSelector]);

  return { ref, hovered };
}
