'use client';

import { useMockAuth } from '@/features/auth/mock-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppForm } from '@/lib/form';
import { LoadingButton } from '@/components/ui/loading-button';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Enter a valid email address' })
});

export default function ProfileViewPage() {
  const { user } = useMockAuth();

  const form = useAppForm({
    defaultValues: {
      name: user?.fullName ?? '',
      email: user?.email ?? ''
    },
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => {
      toast.success(`Profile updated (demo): ${value.name}`);
    }
  });

  if (!user) return null;

  return (
    <div className='flex w-full flex-col p-4'>
      <Card className='max-w-xl'>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your demo profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className='space-y-4'
          >
            <form.AppField
              name='name'
              children={(field) => (
                <field.TextField label='Name' placeholder='Your name' />
              )}
            />
            <form.AppField
              name='email'
              children={(field) => (
                <field.TextField label='Email' type='email' placeholder='you@example.com' />
              )}
            />
            <LoadingButton type='submit' className='w-full'>
              Save changes
            </LoadingButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
