'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { WIDE_FORM_MODAL } from '@/components/forms/form-grid';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';

const AddIcon = Icons.add;

interface FormSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  /** DOM id of the form; the footer's submit button targets it. */
  readonly formId: string;
  readonly onSubmit: () => void;
  readonly isPending: boolean;
  readonly submitLabel: string;
  /** The form fields. */
  readonly children: ReactNode;
}

// Centered sheet around a form: title, scrollable body, Cancel + submit footer.
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  formId,
  onSubmit,
  isPending,
  submitLabel,
  children
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='center' className={WIDE_FORM_MODAL}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id={formId}
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {children}
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form={formId}>
            {submitLabel}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Title, description, form id and submit label of the usual "New X" / "Edit X" sheet. */
export const entitySheetProps = (entity: string, isEdit: boolean) => {
  const lower = entity.toLowerCase();
  return {
    title: `${isEdit ? 'Edit' : 'New'} ${entity}`,
    description: isEdit
      ? `Update the ${lower} details below.`
      : `Fill in the details to create a new ${lower}.`,
    formId: `${lower}-form-sheet`,
    submitLabel: `${isEdit ? 'Update' : 'Create'} ${entity}`
  };
};

interface FormSheetTriggerProps {
  /** Button text, e.g. "Add Company". */
  readonly label: string;
  /** Renders the sheet; receives the open state owned by the trigger. */
  readonly children: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode;
}

// "Add …" button that opens a create-form sheet.
export function FormSheetTrigger({ label, children }: FormSheetTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <AddIcon className='mr-2 h-4 w-4' /> {label}
      </Button>
      {children(open, setOpen)}
    </>
  );
}
