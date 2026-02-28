"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  createUploadUrl,
  recordArtifact,
  deleteArtifact,
  getArtifactUrl,
} from "@/lib/actions/artifacts";
import type { EffectiveChecklistItem } from "@/lib/checklist/engine";
import type { ProjectArtifact } from "@/types";

interface ArtifactUploadProps {
  projectId: string;
  item: EffectiveChecklistItem;
  artifacts: ProjectArtifact[];
  onChanged: () => void;
}

const ACCEPTED_TYPES =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArtifactUpload({
  projectId,
  item,
  artifacts,
  onChanged,
}: ArtifactUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        // 1. Get signed upload URL
        const urlResult = await createUploadUrl(
          projectId,
          item.code,
          file.name,
          file.type
        );

        if (!urlResult.success || !urlResult.data) {
          toast.error(urlResult.error ?? "Failed to prepare upload");
          continue;
        }

        const { signedUrl, filePath } = urlResult.data;

        // 2. Upload directly to Supabase Storage
        const uploadResponse = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // 3. Record in database
        const recordResult = await recordArtifact(
          projectId,
          item.code,
          filePath,
          file.name,
          file.type,
          file.size
        );

        if (!recordResult.success) {
          toast.error(recordResult.error ?? "Failed to save file record");
          continue;
        }

        toast.success(`Uploaded ${file.name}`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChanged();
  }

  async function handleDelete(artifactId: string) {
    setDeletingId(artifactId);
    const result = await deleteArtifact(artifactId, projectId);

    if (result.success) {
      toast.success("File deleted");
      onChanged();
    } else {
      toast.error(result.error ?? "Failed to delete file");
    }

    setDeletingId(null);
  }

  async function handleView(artifactId: string) {
    const url = await getArtifactUrl(artifactId, projectId);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Failed to get download URL");
    }
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

  const hasArtifacts = artifacts.length > 0;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Item header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{item.title}</span>
        {!item.required && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Optional
          </Badge>
        )}
        {item.isCupaSpecific && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            CUPA
          </Badge>
        )}
        {hasArtifacts && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            {artifacts.length} file{artifacts.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {item.description && (
        <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
      )}

      {/* Uploaded files */}
      {hasArtifacts && (
        <div className="space-y-1 mb-3">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{artifact.file_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(artifact.file_size_bytes)}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(artifact.uploaded_at).toLocaleDateString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleView(artifact.id)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                disabled={deletingId === artifact.id}
                onClick={() => handleDelete(artifact.id)}
              >
                {deletingId === artifact.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-muted-foreground/40"
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop files here or click to browse
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
      </div>
    </div>
  );
}
