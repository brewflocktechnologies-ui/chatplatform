import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  badgeClassName?: string;
  user: {
    imageUrl?: string;
    fullName?: string | null;
    emailAddresses: Array<{ emailAddress: string }>;
  } | null;
}

export function UserAvatarProfile({
  className,
  showInfo = false,
  badgeClassName,
  user
}: UserAvatarProfileProps) {
  return (
    <div className='flex items-center gap-2 group-data-[collapsible=icon]:contents'>
      <Avatar className={`${className || ''} shrink-0`}>
        <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
        <AvatarFallback className='rounded-lg'>
          {user?.fullName?.slice(0, 2)?.toUpperCase() || 'CN'}
        </AvatarFallback>
        {badgeClassName && <AvatarBadge className={badgeClassName} />}
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none'>
          <span className='truncate font-semibold'>{user?.fullName || ''}</span>
          <span className='truncate text-xs'>{user?.emailAddresses[0].emailAddress || ''}</span>
        </div>
      )}
    </div>
  );
}
