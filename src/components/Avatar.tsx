import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';

const SIZES = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-14 h-14 text-xl',
  lg: 'w-24 h-24 text-4xl',
} as const;

export type AvatarSize = keyof typeof SIZES;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** Profile photo with an initial-letter fallback. */
export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      className={`${SIZES[size]} rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold border border-blue-200 bg-blue-100 text-blue-700 ${className}`}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : (name?.charAt(0).toUpperCase() || '?')}
    </div>
  );
}

/**
 * Downscales to a square JPEG data URL so a photo costs ~20–40 KB in the
 * database instead of several megabytes. Avoids needing a Storage bucket.
 */
export async function resizeImageToDataUrl(file: File, max = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = max;
  canvas.height = max;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');

  // Centre-crop to a square, then scale down.
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, max, max);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.85);
}

interface AvatarUploadProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  /** Receives a data URL, or null when the photo is removed. */
  onChange: (dataUrl: string | null) => Promise<void> | void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/** Avatar with an overlay button that uploads, resizes and saves a new photo. */
export function AvatarUpload({ name, src, size = 'lg', onChange, onError, disabled }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError?.('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      onError?.('That image is larger than 8MB. Please choose a smaller one.');
      return;
    }

    setBusy(true);
    try {
      await onChange(await resizeImageToDataUrl(file));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not update the photo.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await onChange(null);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not remove the photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar name={name} src={src} size={size} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          title="Change photo"
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {src && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Remove photo
        </button>
      )}
    </div>
  );
}
