'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';

const EllipsisIcon = Icons.ellipsis;
const TrashIcon = Icons.trash;

export interface RowActionItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface RowActionsProps {
  /** Menu entries shown above the built-in Delete entry. */
  readonly items: readonly RowActionItem[];
  /** Runs after the user confirms; call `close` to dismiss the confirmation dialog. */
  readonly onDelete: (close: () => void) => void;
  readonly isDeleting: boolean;
  /** Sheets / dialogs the menu entries open; rendered next to the menu. */
  readonly children?: ReactNode;
}

// The "⋯" actions menu of a table row, with the shared delete confirmation.
export function RowActions({ items, onDelete, isDeleting, children }: Readonly<RowActionsProps>) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const close = () => setDeleteOpen(false);

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={close}
        onConfirm={() => onDelete(close)}
        loading={isDeleting}
      />
      {children}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={<Button type='button' variant='ghost' className='h-8 w-8 p-0' />}
        >
          <span className='sr-only'>Open menu</span>
          <EllipsisIcon className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            {items.map(({ label, icon: Icon, onSelect }) => (
              <DropdownMenuItem key={label} onClick={onSelect}>
                <Icon className='mr-2 h-4 w-4' /> {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              <TrashIcon className='mr-2 h-4 w-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
