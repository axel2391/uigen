"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { Send, ImagePlus, X } from "lucide-react";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>, options?: { experimental_attachments?: FileList }) => void;
  isLoading: boolean;
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: MessageInputProps) {
  const [attachments, setAttachments] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    handleSubmit(e, { experimental_attachments: attachments });
    setAttachments(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    if (!attachments) return;
    const dt = new DataTransfer();
    Array.from(attachments).forEach((file, i) => {
      if (i !== index) dt.items.add(file);
    });
    setAttachments(dt.files.length > 0 ? dt.files : undefined);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
    }
  };

  const previews = attachments ? Array.from(attachments) : [];

  return (
    <form onSubmit={onSubmit} className="relative p-4 bg-white border-t border-neutral-200/60">
      <div className="relative max-w-4xl mx-auto space-y-2">

        {/* Image previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {previews.map((file, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-16 w-16 object-cover rounded-lg border border-neutral-200"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 bg-neutral-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="relative">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe el componente React que quieres crear..."
            disabled={isLoading}
            className="w-full min-h-[80px] max-h-[200px] pl-4 pr-20 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-neutral-400 text-[15px] font-normal shadow-sm"
            rows={3}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setAttachments(e.target.files ?? undefined)}
          />

          {/* Image attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="absolute right-12 bottom-3 p-2.5 rounded-lg transition-all hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Adjuntar imagen"
          >
            <ImagePlus className={`h-4 w-4 ${previews.length > 0 ? "text-blue-600" : "text-neutral-400"}`} />
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && previews.length === 0)}
            className="absolute right-3 bottom-3 p-2.5 rounded-lg transition-all hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent group"
          >
            <Send className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isLoading || (!input.trim() && previews.length === 0) ? "text-neutral-300" : "text-blue-600"}`} />
          </button>
        </div>
      </div>
    </form>
  );
}
