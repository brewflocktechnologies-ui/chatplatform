'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
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
import { useAppForm } from '@/lib/form';
import { ApiError, unwrap } from '@/lib/billing/errors';
import { createPocWidget, updatePocWidget } from '../api/service';
import type { PocWidget, PocWidgetMutationPayload } from '../api/types';
import { pocWidgetSchema, type PocWidgetFormValues } from '../schemas/poc-widget';

const POSITION_OPTIONS = [
  { value: 'BOTTOM_RIGHT', label: 'Bottom right' },
  { value: 'BOTTOM_LEFT', label: 'Bottom left' },
  { value: 'TOP_RIGHT', label: 'Top right' },
  { value: 'TOP_LEFT', label: 'Top left' },
  { value: 'CENTER', label: 'Center' }
];

const THEME_OPTIONS = [
  { value: 'LIGHT', label: 'Light' },
  { value: 'DARK', label: 'Dark' },
  { value: 'CUSTOM', label: 'Custom' }
];

interface PocWidgetFormSheetProps {
  widget?: PocWidget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

// The API stores blank optional text as null.
const orNull = (value: string) => value.trim() || null;

export function PocWidgetFormSheet({ widget, open, onOpenChange }: PocWidgetFormSheetProps) {
  const isEdit = !!widget;
  const router = useRouter();

  // The list is server-rendered, so a refresh is what re-fetches it.
  const createMutation = useMutation({
    mutationFn: async (data: PocWidgetMutationPayload) => unwrap(await createPocWidget(data)),
    onSuccess: () => {
      router.refresh();
      toast.success('Widget created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't create widget. Try again."))
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: PocWidgetMutationPayload }) =>
      unwrap(await updatePocWidget(id, values)),
    onSuccess: () => {
      router.refresh();
      toast.success('Widget updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error, "Couldn't update widget. Try again."))
  });

  const form = useAppForm({
    defaultValues: {
      widgetName: widget?.widgetName ?? '',
      companyId: widget?.companyId ?? 702,
      assistantId: widget?.assistantId ?? 3902,
      websiteUrl: widget?.websiteUrl ?? '',
      position: widget?.position ?? 'BOTTOM_RIGHT',
      theme: widget?.theme ?? 'LIGHT',
      primaryColor: widget?.primaryColor ?? '#007bff',
      greetingMessage: widget?.greetingMessage ?? 'Hello! How can we help?',
      offlineMessage: widget?.offlineMessage ?? "We're offline right now. Please leave a message!",
      showAgentName: widget?.showAgentName ?? true,
      showTypingIndicator: widget?.showTypingIndicator ?? true,
      enableFileUpload: widget?.enableFileUpload ?? false,
      maxFileSizeMb: widget?.maxFileSizeMb ?? 10,
      enableSoundNotification: widget?.enableSoundNotification ?? true,
      autoPopup: widget?.autoPopup ?? false,
      popupDelaySeconds: widget?.popupDelaySeconds ?? undefined,
      isActive: widget?.isActive ?? true
    } as PocWidgetFormValues,
    validators: {
      onSubmit: pocWidgetSchema
    },
    onSubmit: async ({ value }) => {
      const payload: PocWidgetMutationPayload = {
        companyId: value.companyId,
        assistantId: value.assistantId,
        widgetName: value.widgetName.trim(),
        websiteUrl: orNull(value.websiteUrl),
        position: value.position,
        theme: value.theme,
        primaryColor: value.primaryColor,
        greetingMessage: orNull(value.greetingMessage),
        offlineMessage: orNull(value.offlineMessage),
        showAgentName: value.showAgentName,
        showTypingIndicator: value.showTypingIndicator,
        enableFileUpload: value.enableFileUpload,
        maxFileSizeMb: value.maxFileSizeMb,
        enableSoundNotification: value.enableSoundNotification,
        autoPopup: value.autoPopup,
        // A delay only means something when the popup is on.
        popupDelaySeconds: value.autoPopup ? (value.popupDelaySeconds ?? null) : null,
        isActive: value.isActive
      };
      try {
        if (isEdit) {
          await updateMutation.mutateAsync({ id: widget.id, values: payload });
        } else {
          await createMutation.mutateAsync(payload);
        }
      } catch {
        // Already reported by the mutation's onError.
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='center' className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Widget' : 'New Widget'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the widget settings below.'
              : 'Fill in the details to create a new chat widget.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='poc-widget-form-sheet'
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='widgetName'
                children={(field) => (
                  <field.TextField label='Widget Name' required placeholder='Support widget' />
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='companyId'
                  children={(field) => (
                    <field.TextField label='Company ID' type='number' min={1} required />
                  )}
                />
                <form.AppField
                  name='assistantId'
                  children={(field) => (
                    <field.TextField label='Assistant ID' type='number' min={1} required />
                  )}
                />
              </div>
              <form.AppField
                name='websiteUrl'
                children={(field) => (
                  <field.TextField label='Website URL' placeholder='https://example.com' />
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='position'
                  children={(field) => (
                    <field.SelectField label='Position' required options={POSITION_OPTIONS} />
                  )}
                />
                <form.AppField
                  name='theme'
                  children={(field) => (
                    <field.SelectField label='Theme' required options={THEME_OPTIONS} />
                  )}
                />
              </div>
              <form.AppField
                name='primaryColor'
                children={(field) => <field.ColorField label='Primary Color' />}
              />
              <form.AppField
                name='greetingMessage'
                children={(field) => <field.TextareaField label='Greeting Message' />}
              />
              <form.AppField
                name='offlineMessage'
                children={(field) => <field.TextareaField label='Offline Message' />}
              />
              <form.AppField
                name='maxFileSizeMb'
                children={(field) => (
                  <field.TextField
                    label='Max File Size (MB)'
                    type='number'
                    min={1}
                    description='Applies when file upload is enabled.'
                  />
                )}
              />

              <form.AppField
                name='showAgentName'
                children={(field) => (
                  <field.SwitchField
                    label='Show agent name'
                    description='Display the agent name on replies.'
                  />
                )}
              />
              <form.AppField
                name='showTypingIndicator'
                children={(field) => (
                  <field.SwitchField
                    label='Typing indicator'
                    description='Show when an agent is typing.'
                  />
                )}
              />
              <form.AppField
                name='enableFileUpload'
                children={(field) => (
                  <field.SwitchField label='File upload' description='Let visitors attach files.' />
                )}
              />
              <form.AppField
                name='enableSoundNotification'
                children={(field) => (
                  <field.SwitchField
                    label='Sound notification'
                    description='Play a sound on new messages.'
                  />
                )}
              />
              <form.AppField
                name='autoPopup'
                children={(field) => (
                  <field.SwitchField
                    label='Auto popup'
                    description='Open the widget automatically.'
                  />
                )}
              />
              <form.Subscribe selector={(state) => state.values.autoPopup}>
                {(autoPopup) =>
                  autoPopup && (
                    <form.AppField
                      name='popupDelaySeconds'
                      children={(field) => (
                        <field.TextField
                          label='Popup Delay (seconds)'
                          type='number'
                          min={0}
                          placeholder='5'
                        />
                      )}
                    />
                  )
                }
              </form.Subscribe>
              <form.AppField
                name='isActive'
                children={(field) => (
                  <field.SwitchField label='Active' description='Serve this widget on the site.' />
                )}
              />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='poc-widget-form-sheet'>
            {isEdit ? 'Update Widget' : 'Create Widget'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PocWidgetFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Widget
      </Button>
      <PocWidgetFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
