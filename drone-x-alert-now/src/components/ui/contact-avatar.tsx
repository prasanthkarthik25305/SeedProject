import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, UserCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gender?: 'male' | 'female' | 'other' | null;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  isMutual?: boolean;
  showStatus?: boolean;
  className?: string;
  groupAvatars?: Array<{ photoUrl?: string; name: string; gender?: string }>;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const textSizeMap = {
  xs: 'text-xs',
  sm: 'text-xs', 
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

// Gender-based color schemes for avatars
const getGenderColors = (gender?: 'male' | 'female' | 'other' | null) => {
  switch (gender) {
    case 'male':
      return {
        bg: 'bg-blue-500',
        ring: 'ring-blue-200'
      };
    case 'female':
      return {
        bg: 'bg-pink-500', 
        ring: 'ring-pink-200'
      };
    default:
      return {
        bg: 'bg-gray-500',
        ring: 'ring-gray-200'
      };
  }
};

// Generate initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

// Generate consistent color for names without gender info
const getNameColor = (name: string): string => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
  ];
  
  const hash = name.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  photoUrl,
  name,
  size = 'md',
  gender,
  isOnline,
  showOnlineStatus,
  isMutual,
  showStatus = true,
  className,
  groupAvatars
}) => {
  const actualShowStatus = showOnlineStatus ?? showStatus;
  const actualSize = typeof size === 'number' ? 'md' : size;
  // Group avatar logic for multiple contacts
  if (groupAvatars && groupAvatars.length > 1) {
    return (
      <div className={cn("relative", sizeMap[actualSize], className)}>
        <div className="grid grid-cols-2 gap-px w-full h-full rounded-full overflow-hidden bg-gray-200">
          {groupAvatars.slice(0, 4).map((avatar, index) => (
            <div key={index} className="relative">
              {avatar.photoUrl ? (
                <img
                  src={avatar.photoUrl}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={cn(
                  "w-full h-full flex items-center justify-center text-white text-xs font-medium",
                  gender ? getGenderColors(avatar.gender as 'male' | 'female' | 'other' | null).bg : getNameColor(avatar.name)
                )}>
                  {getInitials(avatar.name)}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {groupAvatars.length > 4 && (
          <div className="absolute -bottom-1 -right-1 bg-gray-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            +{groupAvatars.length - 4}
          </div>
        )}
      </div>
    );
  }

  const genderColors = getGenderColors(gender);
  const nameColor = getNameColor(name);
  const initials = getInitials(name);

  // Handle numeric size by converting to pixel-based styling
  const sizeStyles = typeof size === 'number' 
    ? { width: `${size}px`, height: `${size}px` }
    : {};
  
  const avatarClassName = typeof size === 'number' 
    ? '' 
    : sizeMap[actualSize];

  return (
    <div className={cn("relative", className)} style={typeof size === 'number' ? sizeStyles : {}}>
      <Avatar className={cn(avatarClassName, actualShowStatus && "ring-2 ring-white")} style={sizeStyles}>
        <AvatarImage 
          src={photoUrl || undefined} 
          alt={name}
          className="object-cover"
        />
        <AvatarFallback 
          className={cn(
            "font-medium text-white",
            textSizeMap[actualSize],
            gender ? genderColors.bg : nameColor
          )}
        >
          {initials || <User className={cn(
            actualSize === 'xs' ? 'w-3 h-3' :
            actualSize === 'sm' ? 'w-4 h-4' :
            actualSize === 'md' ? 'w-5 h-5' :
            actualSize === 'lg' ? 'w-6 h-6' :
            'w-8 h-8'
          )} />}
        </AvatarFallback>
      </Avatar>

      {/* Online Status Indicator */}
      {actualShowStatus && isOnline && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full border-2 border-white",
          actualSize === 'xs' ? 'w-2 h-2' :
          actualSize === 'sm' ? 'w-2.5 h-2.5' :
          actualSize === 'md' ? 'w-3 h-3' :
          actualSize === 'lg' ? 'w-3.5 h-3.5' :
          'w-4 h-4'
        )} />
      )}

      {/* Mutual Contact Indicator */}
      {actualShowStatus && isMutual && !isOnline && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center",
          actualSize === 'xs' ? 'w-3 h-3' :
          actualSize === 'sm' ? 'w-3.5 h-3.5' :
          actualSize === 'md' ? 'w-4 h-4' :
          actualSize === 'lg' ? 'w-4.5 h-4.5' :
          'w-5 h-5'
        )}>
          <UserCheck className="w-2 h-2 text-white" />
        </div>
      )}
    </div>
  );
};

export default ContactAvatar;