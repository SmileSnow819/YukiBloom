import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@admin-ui/components/ui/dialog';
import { cn } from '@admin-ui/lib/utils';
import { useState } from 'react';

interface ImagePreviewDialogProps {
  src: string;
  alt: string;
  thumbnailClassName?: string;
}

export function ImagePreviewDialog({ src, alt, thumbnailClassName }: ImagePreviewDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`预览${alt}`}
        className="block cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn('rounded-md border border-border object-cover', thumbnailClassName)}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-auto p-3">
          <DialogHeader className="pr-8">
            <DialogTitle className="truncate text-sm">{alt}</DialogTitle>
          </DialogHeader>
          <div className="grid min-h-24 place-items-center">
            <img src={src} alt={alt} className="max-h-[80vh] max-w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
