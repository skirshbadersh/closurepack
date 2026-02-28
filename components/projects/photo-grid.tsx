"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Upload, Camera, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCard } from "./photo-card";
import {
  createPhotoUploadUrl,
  recordPhoto,
  reorderPhotos,
  getProjectPhotos,
  type PhotoWithUrl,
} from "@/lib/actions/photos";

interface PhotoGridProps {
  projectId: string;
  initialPhotos: PhotoWithUrl[];
}

export function PhotoGrid({ projectId, initialPhotos }: PhotoGridProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local state when server re-renders with new props
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      try {
        // 1. Get signed upload URL
        const urlResult = await createPhotoUploadUrl(
          projectId,
          file.name,
          file.type
        );

        if (!urlResult.success || !urlResult.data) {
          toast.error(urlResult.error ?? "Failed to prepare upload");
          continue;
        }

        // 2. Upload to storage
        const uploadResponse = await fetch(urlResult.data.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // 3. Record in database
        const recordResult = await recordPhoto(
          projectId,
          urlResult.data.filePath,
          file.name
        );

        if (!recordResult.success) {
          toast.error(recordResult.error ?? "Failed to save photo");
          continue;
        }

        toast.success(`Uploaded ${file.name}`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Fetch fresh photos with signed URLs to update display immediately
    const freshPhotos = await getProjectPhotos(projectId);
    setPhotos(freshPhotos);
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic reorder
    const reordered = [...photos];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Update sort_order in local state
    const updated = reordered.map((p, i) => ({
      ...p,
      sort_order: i + 1,
    }));
    setPhotos(updated);

    // Persist to database
    const orderedIds = updated.map((p) => p.id);
    const result = await reorderPhotos(projectId, orderedIds);

    if (!result.success) {
      toast.error("Failed to save new order");
      // Revert
      setPhotos(initialPhotos);
    }
  }

  async function handleDeleted() {
    const freshPhotos = await getProjectPhotos(projectId);
    setPhotos(freshPhotos);
    router.refresh();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Photo Log</CardTitle>
            <span className="text-sm text-muted-foreground">
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Upload and order photos for the closure report photo log. These
            will be compiled into a Photo Log PDF during export. Drag photos to
            reorder them.
          </p>
        </CardContent>
      </Card>

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-muted-foreground/40"
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Uploading photos...
            </span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop photos here or click to browse
            </span>
            <span className="text-xs text-muted-foreground">
              JPEG, PNG — multiple files supported
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
      </div>

      {/* Photo grid with DnD */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
          <Camera className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No photos yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Upload photos of the closure activities, tank removal, site
            conditions, and sampling locations.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  projectId={projectId}
                  photo={photo}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
