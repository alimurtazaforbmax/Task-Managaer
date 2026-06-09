import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import type { ApiResponse, ProjectDocument } from "../types";

interface ProjectDocumentsSectionProps {
  readonly projectId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDocumentsSection({ projectId }: ProjectDocumentsSectionProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProjectDocument[]>>(
        `/projects/${projectId}/documents/`
      );
      return unwrap(res);
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      if (title.trim()) fd.append("title", title.trim());
      await api.post(`/projects/${projectId}/documents/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      setTitle("");
      setError("");
      qc.invalidateQueries({ queryKey: ["project-documents", projectId] });
    },
    onError: () => setError("Could not upload document. Check file type and size."),
  });

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-lg text-slate-900">Project documents</h2>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadDocument.isPending}
          className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-sm"
        >
          {uploadDocument.isPending ? "Uploading…" : "Upload document"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadDocument.mutate(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm"
          placeholder="Document title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}

      {isLoading ? (
        <p className="text-slate-400 mt-4 text-sm">Loading documents…</p>
      ) : !documents?.length ? (
        <p className="text-slate-400 mt-4 text-sm">No documents uploaded yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.original_name} · {formatFileSize(doc.size_bytes)}
                  </p>
                </div>
              </div>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
