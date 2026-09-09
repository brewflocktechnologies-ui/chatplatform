'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// KBar's provider/palette pulls ~231 KB of kbar + floating-ui + nav code into
// any loadable chunk it touches. It is only useful when the user actually
// opens the palette, so it is loaded on first trigger instead of on page load.
//
// Triggers:
//   - Cmd/Ctrl+K  → mounts the provider (after that, kbar handles the
//                   shortcut itself via its internal listener)
//   - window 'kbar:open' event → mounts on first fire, toggles the palette
//                   afterwards (this is what SearchInput dispatches)
const KBar = dynamic(() => import('./index'), { ssr: false });

export function LazyKBar({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [openNonce, setOpenNonce] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  useEffect(() => {
    const openPalette = () => {
      if (!mountedRef.current) {
        setMounted(true);
      } else {
        setOpenNonce((n) => n + 1);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!mountedRef.current) {
          setMounted(true);
        }
      }
    };

    window.addEventListener('kbar:open', openPalette);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('kbar:open', openPalette);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <KBar openOnMount openNonce={openNonce}>
      {children}
    </KBar>
  );
}