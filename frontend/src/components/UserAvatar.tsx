import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";

interface UserAvatarProps {
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly seed?: string | number;
  readonly size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
};

export default function UserAvatar({
  name,
  photoUrl,
  seed = name,
  size = "md",
}: UserAvatarProps) {
  const palette = getProjectPalette(seed);
  const sizeClass = SIZES[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover border-2 border-white shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${palette.gradient}`}
    >
      {getProjectInitials(name)}
    </div>
  );
}
