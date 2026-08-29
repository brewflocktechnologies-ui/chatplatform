import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import MockLoginForm from './mock-login-form';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Authentication forms built using the components.'
};

export default function SignUpViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/examples/authentication'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Login
      </Link>

      {/* Left side */}
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-sidebar' />

        {/* Logo */}
        <div className='text-sidebar-foreground relative z-20 flex items-center text-lg font-medium'>
          <Image
            src='/images/Logo.png'
            alt='Logo'
            width={40}
            height={40}
            className='mr-3 rounded-lg object-contain'
            priority
          />
          Vainateya
        </div>

 
      {/* Sign Up image */}
      <div className='relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden'>
        <Image
          src='/images/Sign-up.png'
          alt='Sign-up'
          width={400}
          height={400}
          className='max-h-[55vh] w-auto object-contain'
          priority
        />
      </div>

      </div>

      {/* Right side */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <MockLoginForm />
        </div>
      </div>
    </div>
  );
}