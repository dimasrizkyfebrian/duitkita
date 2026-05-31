"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function AvatarCropModal({
  open,
  imageSrc,
  onConfirm,
  onCancel,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(file);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isProcessing) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-sm gap-0 overflow-hidden p-0 bg-[#120827] border border-white/[0.07]"
      >
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-white/90">Sesuaikan foto profil</DialogTitle>
        </DialogHeader>

        <div className="relative w-full bg-black" style={{ height: 300 }}>
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
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <span className="shrink-0 text-xs text-white/40">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full cursor-pointer accent-purple-500"
            aria-label="Zoom foto"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.07] bg-white/[0.02] px-4 py-3 rounded-b-xl">
          <Button
            variant="outline"
            className="border-white/[0.1] text-white/70 hover:bg-white/[0.07]"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Batal
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isProcessing || !croppedAreaPixels}
            style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)" }}
            className="border-0 text-white"
          >
            {isProcessing ? "Memproses…" : "Konfirmasi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
