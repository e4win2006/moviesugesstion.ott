"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Music,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileAudio,
  Plus,
  Radio,
  Sparkles,
} from "lucide-react";
import { formatBytes, type MediaFile } from "@/lib/media-types";
import { cn } from "@/lib/utils";

interface MusicUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newFiles: MediaFile[]) => void;
  targetDir?: string | null;
}

export function MusicUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  targetDir,
}: MusicUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validAudioExts = [
      ".mp3",
      ".flac",
      ".wav",
      ".m4a",
      ".aac",
      ".ogg",
      ".opus",
      ".wma",
    ];

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.toLowerCase();
      const isValid =
        file.type.startsWith("audio/") ||
        validAudioExts.some((ext) => name.endsWith(ext));

      if (isValid) {
        newFiles.push(file);
      }
    }

    if (newFiles.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please select valid audio files (.mp3, .flac, .wav, .m4a, .aac, .ogg).",
      });
      return;
    }

    setStatusMessage(null);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("type", "music");
      if (targetDir) {
        formData.append("dir", targetDir);
      }

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      setUploadProgress(45);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress(100);
      setStatusMessage({
        type: "success",
        text: `Successfully uploaded and saved ${data.count} song(s) to server library!`,
      });

      if (data.files && data.files.length > 0) {
        onUploadSuccess(data.files);
      }

      setTimeout(() => {
        setSelectedFiles([]);
        setIsUploading(false);
        setUploadProgress(0);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsUploading(false);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to upload songs.",
      });
    }
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black shadow-2xl p-6 sm:p-7 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#1db954]/20 text-[#1db954] border border-[#1db954]/30 shadow-lg shadow-[#1db954]/10">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Upload Music to Library</h3>
              <p className="text-xs text-zinc-400">
                Stored permanently &amp; playable with AI neural recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2.5 rounded-2xl p-3 text-xs font-semibold border",
              statusMessage.type === "success"
                ? "border-[#1db954]/30 bg-[#1db954]/10 text-[#1db954]"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            )}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "mt-4 relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300",
            dragActive
              ? "border-[#1db954] bg-[#1db954]/10 scale-[1.01]"
              : "border-white/15 bg-white/[.02] hover:border-white/30 hover:bg-white/[.04]"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.flac,.wav,.m4a,.aac,.ogg,.opus"
            className="hidden"
            onChange={(e) => validateAndAddFiles(e.target.files)}
          />

          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-800 text-zinc-300 border border-white/10 shadow-inner group-hover:scale-105 transition">
            <Music size={28} className="text-[#1db954]" />
          </div>

          <div>
            <p className="text-sm font-bold text-white">
              Drag &amp; Drop audio files here, or <span className="text-[#1db954] underline">Browse Files</span>
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              Supports MP3, FLAC, WAV, M4A, AAC, OGG &amp; OPUS
            </p>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 flex-1 min-h-0 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span>Ready for upload ({selectedFiles.length})</span>
              <span className="font-mono text-zinc-300">{formatBytes(totalBytes)}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 pr-1 custom-scrollbar">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-white/[.04] border border-white/5 p-2.5 text-xs hover:border-white/15 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileAudio size={16} className="text-[#1db954] shrink-0" />
                    <span className="truncate text-zinc-200 font-medium">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-zinc-500">
                      {formatBytes(file.size)}
                    </span>
                    {!isUploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="rounded-lg p-1 text-zinc-400 hover:text-rose-400 transition"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin text-[#1db954]" /> Storing files on server &amp; extracting audio tags...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-[#1db954] to-emerald-400 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex items-center gap-2 rounded-xl bg-[#1db954] px-6 py-2.5 text-xs font-black text-ink hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-[#1db954]/20 active:scale-95"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
