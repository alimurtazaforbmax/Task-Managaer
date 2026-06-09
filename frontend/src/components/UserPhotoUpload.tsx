import { useRef } from "react";
import UserAvatar from "./UserAvatar";

interface UserPhotoUploadProps {
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly previewUrl?: string | null;
  readonly seed?: string | number;
  readonly onSelect: (file: File) => void;
  readonly onClear: () => void;
  readonly hasExistingPhoto?: boolean;
}

export default function UserPhotoUpload({
  name,
  photoUrl,
  previewUrl,
  seed = name,
  onSelect,
  onClear,
  hasExistingPhoto = false,
}: UserPhotoUploadProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl ?? photoUrl;
  const hasPhoto = Boolean(previewUrl || hasExistingPhoto);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-brand-50/40 p-4">
      <UserAvatar name={name} photoUrl={displayUrl} seed={seed} size="lg" />
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Profile photo</p>
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {hasPhoto ? "Change photo" : "Upload photo"}
        </button>
        {hasPhoto && (
          <button
            type="button"
            onClick={onClear}
            className="block text-xs text-slate-500 hover:text-slate-700"
          >
            Remove selection
          </button>
        )}
        <p className="text-xs text-slate-400">JPG, PNG or WebP · max 5 MB</p>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />
    </div>
  );
}
