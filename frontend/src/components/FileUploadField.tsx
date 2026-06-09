import { useRef } from "react";

interface FileUploadFieldProps {
  readonly label?: string;
  readonly hint?: string;
  readonly accept?: string;
  readonly files: File[];
  readonly onChange: (files: File[]) => void;
}

export default function FileUploadField({
  label = "Attachments",
  hint = "Images or video · optional",
  accept = "image/*,video/*",
  files,
  onChange,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    onChange([...files, ...Array.from(incoming)]);
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 border border-brand-200 bg-white px-3 py-1.5 rounded-lg shadow-sm"
        >
          Choose files
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-slate-700">{file.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="shrink-0 text-xs text-rose-600 hover:text-rose-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
