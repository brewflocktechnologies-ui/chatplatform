import { FieldGroup } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * Two-column field layout for form modals; collapses to one column on narrow screens.
 * Fields sit side by side by default, and `FormRow` spans a field across both columns.
 */
export function FormGrid({ className, ...props }: React.ComponentProps<typeof FieldGroup>) {
  return <FieldGroup className={cn('grid gap-x-4 gap-y-4 sm:grid-cols-2', className)} {...props} />;
}

/** A field (or block) that takes the full width of a `FormGrid`. */
export function FormRow({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('sm:col-span-2', className)} {...props} />;
}

/** Wide modal for a `FormGrid`; pass as the `className` of `SheetContent`. */
export const WIDE_FORM_MODAL = 'flex flex-col data-[side=center]:sm:max-w-2xl';
