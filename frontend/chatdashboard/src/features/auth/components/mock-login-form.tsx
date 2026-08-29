'use client';

import { useMockAuth } from '@/features/auth/mock-auth';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAppForm } from '@/lib/form';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' })
});

export default function MockLoginForm() {
  const { login } = useMockAuth();

  const form = useAppForm({
    defaultValues: { name: 'Demo User' },
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => {
      login(value.name);
    }
  });

  return (
    <div className='w-full space-y-4'>
      <div className='space-y-2 text-center'>
        <h1 className='text-2xl font-semibold'>Sign in to your account</h1>
        <p className='text-muted-foreground text-sm'>
          Demo mode — no password required. Click login to continue.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className='w-full space-y-3'
      >
        <form.AppField
          name='name'
          children={(field) => (
            <field.TextField label='Name' placeholder='Your name' />
          )}
        />
        <LoadingButton type='submit' className='w-full'>
          Login (Demo)
        </LoadingButton>
      </form>
    </div>
  );
}
