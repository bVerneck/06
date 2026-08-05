import { useEffect } from "react";
import { X } from "lucide-react";
import type { Attachment } from "@/lib/taskData";

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function AttachmentLightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white text-sm font-medium truncate max-w-[75%]">
          {alt ?? "Anexo"}
        </span>
        <button
          onClick={onClose}
          className="h-10 w-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt ?? "Anexo"}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>
    </div>
  );
}

/** Opens a non-image attachment in a new tab so the device can hand off to an external app. */
export function openAttachmentExternal(att: Attachment): boolean {
  if (att.url) {
    window.open(att.url, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}
