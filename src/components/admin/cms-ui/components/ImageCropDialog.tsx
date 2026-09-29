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
import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { toast } from 'sonner';

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 675;

interface ImageCropDialogProps {
  file: File;
  onOpenChange: (open: boolean) => void;
  onCrop: (file: File) => void;
}

async function createCroppedFile(imageUrl: string, area: Area, sourceFile: File): Promise<File> {
  const image = new window.Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建图片裁剪画布');

  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('裁剪图片失败，请重试');

  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'cover';
  return new File([blob], `${baseName}-cover.${extension}`, { type: blob.type });
}

export function ImageCropDialog({ file, onOpenChange, onCrop }: ImageCropDialogProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  async function handleCrop() {
    if (!imageUrl || !croppedAreaPixels) return;

    setIsCropping(true);
    try {
      const croppedFile = await createCroppedFile(imageUrl, croppedAreaPixels, file);
      onOpenChange(false);
      onCrop(croppedFile);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '裁剪图片失败，请重试');
    } finally {
      setIsCropping(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>裁剪文章封面</DialogTitle>
          <DialogDescription>输出比例固定为 16:9。拖动图片调整位置，使用缩放滑块或滚轮调整取景范围。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/90">
            {imageUrl ? (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                minZoom={1}
                maxZoom={3}
                objectFit="cover"
                restrictPosition
                roundCropAreaPixels
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <Icon icon="ri:loader-4-line" className="size-6 animate-spin" />
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 text-sm">
            <span className="shrink-0 font-medium">缩放</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={!imageUrl}
              className="w-full accent-primary"
            />
            <span className="w-12 text-right text-muted-foreground">{zoom.toFixed(1)}×</span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCropping}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleCrop()} disabled={!croppedAreaPixels || isCropping}>
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
