import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import { downloadReportPdf, fetchReportPdfBlob } from "../utils/downloadReportPdf";
import type { ApiResponse, WorkItemReport } from "../types";

interface ReportModalProps {
  readonly url: string;
  readonly filename: string;
  readonly onClose: () => void;
}

const TONE_STYLES: Record<string, string> = {
  default: "bg-slate-50 border-slate-200 text-slate-900",
  task: "bg-sky-50 border-sky-200 text-sky-700",
  bug: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  danger: "bg-rose-50 border-rose-200 text-rose-700",
};

function ReportPreview({ report }: { report: WorkItemReport }) {
  const accent =
    report.report_type === "project"
      ? "from-violet-600 to-indigo-600"
      : "from-brand-600 to-indigo-600";

  return (
    <div className="space-y-5">
      <div className={`rounded-xl bg-gradient-to-r ${accent} px-4 py-3 text-white shadow-sm`}>
        <p className="font-semibold">{report.title}</p>
        <p className="text-xs text-blue-100 mt-0.5">
          {new Date(report.generated_at).toLocaleString()}
        </p>
      </div>

      {report.stat_cards && report.stat_cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {report.stat_cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border px-2 py-2 text-center ${
                TONE_STYLES[card.tone ?? "default"] ?? TONE_STYLES.default
              }`}
            >
              <p className="text-lg font-bold leading-none">{card.value}</p>
              <p className="text-[10px] font-medium mt-1 opacity-80">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {report.profile_rows && report.profile_rows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-800 mb-2">Profile</h3>
          <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {report.profile_rows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 gap-2 bg-slate-50/80 px-3 py-2 text-sm">
                <dt className="font-medium text-slate-600">{row.label}</dt>
                <dd className="col-span-2 text-slate-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {report.sections?.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-brand-800 mb-2">{section.title}</h3>
          {section.headers && section.rows && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm min-w-[280px]">
                <thead>
                  <tr className="bg-brand-600 text-white">
                    {section.headers.map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-slate-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section.bullets && (
            <ul className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
              {section.bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ReportModal({ url, filename, onClose }: ReportModalProps) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["report", url],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WorkItemReport>>(url);
      return unwrap(res);
    },
  });

  useEffect(() => {
    if (!showPdf) return;
    let objectUrl: string | null = null;
    fetchReportPdfBlob(url)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfPreviewUrl(objectUrl);
      })
      .catch(() => setPdfPreviewUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [showPdf, url]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 truncate">
              {report?.title ?? "Generating report…"}
            </h2>
            {report?.generated_at && (
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(report.generated_at).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-3 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowPdf(false)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              !showPdf ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setShowPdf(true)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              showPdf ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            PDF preview
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {isLoading && <p className="text-slate-400 text-sm">Building report…</p>}
          {isError && (
            <p className="text-rose-600 text-sm">Could not generate report. Try again.</p>
          )}
          {report && !showPdf && <ReportPreview report={report} />}
          {showPdf && (
            <>
              {!pdfPreviewUrl && (
                <p className="text-slate-400 text-sm">Loading PDF preview…</p>
              )}
              {pdfPreviewUrl && (
                <iframe
                  title="Report PDF preview"
                  src={pdfPreviewUrl}
                  className="w-full h-[min(60vh,520px)] rounded-xl border border-slate-200"
                />
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            disabled={!report || downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadReportPdf(url, filename);
              } finally {
                setDownloading(false);
              }
            }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-700"
          >
            {downloading ? "Downloading…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
