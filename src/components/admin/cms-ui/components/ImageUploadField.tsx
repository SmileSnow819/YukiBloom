import { Button } from '@admin-ui/components/ui/button';
import { cn } from '@admin-ui/lib/utils';
import { Icon } from '@iconify/react';
import { useRef, useState } from 'react';

interface ImageUploadFieldProps {
  label: string;
  imageUrl?: string;
  alt: string;
  emptyText?: string;
  uploading?: boolean;
  required?: boolean;
  onFileSelect: (file: File | undefined) => void;
}

export function ImageUploadField({
  label,
  imageUrl,
  alt,
  emptyText = '点击或拖拽图片到此处上传',
  uploading = false,
  required = false,
  onFileSelect,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function openPicker() {
    if (!uploading) inputRef.current?.click();
  }

  function selectFile(file: File | undefined) {
    if (!uploading && file) onFileSelect(file);
  }

  return (
    <div className="space-y-2">
      <span className="font-medium text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <button
        type="button"
        disabled={uploading}
        aria-label={imageUrl ? `点击或拖拽以更改${label}` : `点击或拖拽上传${label}`}
        onClick={openPicker}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!uploading) setIsDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          selectFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          'relative grid aspect-video w-full cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed bg-muted/30 p-0 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          imageUrl && 'border-solid bg-muted/10',
          isDragActive && 'border-primary bg-primary/10',
          uploading && 'cursor-wait opacity-70',
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center text-muted-foreground text-sm">
            <Icon icon="ri:image-add-line" className="size-7" />
            {emptyText}
          </span>
        )}
        {isDragActive && (
          <span className="absolute inset-0 grid place-items-center bg-background/75 font-medium text-primary text-sm">
            松开放入图片
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center gap-2 bg-background/75 font-medium text-sm">
            <Icon icon="ri:loader-4-line" className="size-5 animate-spin" />
            上传中…
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          selectFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      {imageUrl && (
        <Button
          type="button"
          variant="outline"
          onClick={openPicker}
          disabled={uploading}
          className="border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <Icon icon="ri:image-line" className="mr-1.5 size-4" />
          更改图片
        </Button>
      )}
    </div>
  );
}
