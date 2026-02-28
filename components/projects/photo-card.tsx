"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { GripVertical, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  updatePhotoCaption,
  updatePhotoDate,
  deletePhoto,
  type PhotoWithUrl,
} from "@/lib/actions/photos";

interface PhotoCardProps {
  projectId: string;
  photo: PhotoWithUrl;
  onDeleted: () => void;
}

export function PhotoCard({ projectId, photo, onDeleted }: PhotoCardProps) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [photoDate, setPhotoDate] = useState(photo.photo_date ?? "");
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleCaptionBlur() {
    if (caption !== (photo.caption ?? "")) {
      const result = await updatePhotoCaption(photo.id, projectId, caption);
      if (!result.success) {
        toast.error("Failed to save caption");
      }
    }
  }

  async function handleDateChange(value: string) {
    setPhotoDate(value);
    const result = await updatePhotoDate(
      photo.id,
      projectId,
      value || null
    );
    if (!result.success) {
      toast.error("Failed to save date");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deletePhoto(photo.id, projectId);
    if (result.success) {
      toast.success("Photo deleted");
      onDeleted();
    } else {
      toast.error(result.error ?? "Failed to delete photo");
      setIsDeleting(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        {photo.signedUrl ? (
          <img
            src={photo.signedUrl}
            alt={caption || "Photo"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No preview
          </div>
        )}

        {/* Drag handle + delete overlay */}
        <div className="absolute top-2 left-2 right-2 flex justify-between">
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-8 h-8 rounded bg-black/50 text-white cursor-grab active:cursor-grabbing hover:bg-black/70 transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/50 text-white hover:bg-red-600 hover:text-white"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Sort order badge */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-mono px-2 py-0.5 rounded">
          #{photo.sort_order}
        </div>
      </div>

      {/* Caption + Date */}
      <div className="p-3 space-y-2">
        <Input
          placeholder="Add caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="text-sm"
        />
        <Input
          type="date"
          value={photoDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="text-sm"
          placeholder="Photo date"
        />
      </div>
    </div>
  );
}
