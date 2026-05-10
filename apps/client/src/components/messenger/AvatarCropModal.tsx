import { getCroppedImageBlob } from "@/lib/avatar-crop";
import { cn } from "@/lib/utils";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useCallback, useEffect, useState } from "react";

type AvatarCropModalProps = {
  imageSrc: string;
  onClose: () => void;
  onComplete: (blob: Blob) => void;
};

export function AvatarCropModal({
  imageSrc,
  onClose,
  onComplete,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setAreaPx(croppedAreaPixels);
    },
    [],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleApply() {
    if (!areaPx) {
      return;
    }
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, areaPx);
      onComplete(blob);
    } catch {
      /* остаёмся в модалке */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
    >
      <div
        className={cn(
          "flex w-full max-w-[min(100vw-2rem,420px)] flex-col overflow-hidden rounded-[20px] border border-theme-border bg-theme-card shadow-2xl",
        )}
      >
        <div className="border-b border-theme-border px-5 py-4">
          <h2
            id="avatar-crop-title"
            className="text-lg font-semibold tracking-tight text-theme-text"
          >
            Обрезка фото
          </h2>
          <p className="mt-1 text-sm text-theme-text-2">
            Перетащите фото. Масштаб — колесом мыши или жестом «щипок». Область
            внутри круга попадёт в аватар.
          </p>
        </div>

        <div className="relative mx-auto h-[min(72vw,320px)] w-full max-w-[360px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            zoomWithScroll
            minZoom={1}
            maxZoom={3}
          />
        </div>

        <div className="border-t border-theme-border px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              className="min-h-11 rounded-full border border-theme-border bg-theme-card-2 px-5 text-sm font-medium text-theme-text transition-colors hover:bg-theme-hover disabled:opacity-50"
              onClick={onClose}
              disabled={busy}
            >
              Отмена
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
              onClick={handleApply}
              disabled={busy || !areaPx}
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
