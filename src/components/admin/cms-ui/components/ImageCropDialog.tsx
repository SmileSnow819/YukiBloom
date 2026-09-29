import { Button } from '@admin-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@admin-ui/components/ui/dialog';
import { Icon } from '@iconify/react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 675;
const MAX_ZOOM = 3;

interface ImageCropDialogProps {
  file: File;
  onOpenChange: (open: boolean) => void;
  onCrop: (file: File) => void;
}

type Center = { x: number; y: number };

function clampCenter(center: Center, drawWidth: number, drawHeight: number): Center {
  const minX = Math.min(0.5, drawWidth / (2 * OUTPUT_WIDTH));
  const minY = Math.min(0.5, drawHeight / (2 * OUTPUT_HEIGHT));
  return {
    x: Math.max(minX, Math.min(1 - minX, center.x)),
    y: Math.max(minY, Math.min(1 - minY, center.y)),
  };
}

export function ImageCropDialog({ file, onOpenChange, onCrop }: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [imageError, setImageError] = useState(false);
  const [center, setCenter] = useState<Center>({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      imageRef.current = image;
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      setImageError(false);
      setCenter({ x: 0.5, y: 0.5 });
      setZoom(1);
    };
    image.onerror = () => {
      setImageError(true);
      toast.error('无法读取这张图片');
    };
    image.src = objectUrl;
    return () => {
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageSize) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const scale = Math.max(OUTPUT_WIDTH / imageSize.width, OUTPUT_HEIGHT / imageSize.height) * zoom;
    const drawWidth = imageSize.width * scale;
    const drawHeight = imageSize.height * scale;
    const safeCenter = clampCenter(center, drawWidth, drawHeight);
    const left = safeCenter.x * OUTPUT_WIDTH - drawWidth / 2;
    const top = safeCenter.y * OUTPUT_HEIGHT - drawHeight / 2;

    context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    context.drawImage(image, left, top, drawWidth, drawHeight);
  }, [center, imageSize, zoom]);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    dragPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const lastPoint = dragPointRef.current;
    const canvas = canvasRef.current;
    if (!lastPoint || !canvas || !imageSize) return;

    const bounds = canvas.getBoundingClientRect();
    const scale = Math.max(OUTPUT_WIDTH / imageSize.width, OUTPUT_HEIGHT / imageSize.height) * zoom;
    const drawWidth = imageSize.width * scale;
    const drawHeight = imageSize.height * scale;
    const deltaX = (event.clientX - lastPoint.x) / bounds.width;
    const deltaY = (event.clientY - lastPoint.y) / bounds.height;
    dragPointRef.current = { x: event.clientX, y: event.clientY };
    setCenter((current) => clampCenter({ x: current.x + deltaX, y: current.y + deltaY }, drawWidth, drawHeight));
  }

  function handlePointerEnd() {
    dragPointRef.current = null;
  }

  function handleCrop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsCropping(true);
    canvas.toBlob(
      (blob) => {
        setIsCropping(false);
        if (!blob) {
          toast.error('裁剪图片失败，请重试');
          return;
        }
        const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
        onOpenChange(false);
        onCrop(new File([blob], `${baseName}-cover.${extension}`, { type: blob.type }));
      },
      'image/webp',
      0.9,
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>裁剪文章封面</DialogTitle>
          <DialogDescription>输出比例固定为 16:9。拖动图片调整位置，使用缩放滑块调整取景范围。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg bg-black/90">
            {imageSize ? (
              <canvas
                ref={canvasRef}
                width={OUTPUT_WIDTH}
                height={OUTPUT_HEIGHT}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                className="block aspect-video w-full cursor-grab touch-none active:cursor-grabbing"
                aria-label="拖动图片调整封面裁剪范围"
              />
            ) : imageError ? (
              <div className="grid aspect-video place-items-center text-muted-foreground text-sm">
                图片读取失败，请重新选择图片。
              </div>
            ) : (
              <div className="grid aspect-video place-items-center text-muted-foreground">
                <Icon icon="ri:loader-4-line" className="size-6 animate-spin" />
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <span className="shrink-0 font-medium">缩放</span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={!imageSize}
              className="w-full accent-primary"
            />
            <span className="w-12 text-right text-muted-foreground">{zoom.toFixed(1)}×</span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCropping}>
            取消
          </Button>
          <Button type="button" onClick={handleCrop} disabled={!imageSize || isCropping}>
            <Icon
              icon={isCropping ? 'ri:loader-4-line' : 'ri:crop-line'}
              className={`mr-1.5 size-4 ${isCropping ? 'animate-spin' : ''}`}
            />
            {isCropping ? '处理中…' : '裁剪并上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
