import { API_BASE_URL } from "../api/config";

export async function downloadReportPdf(reportPath: string, filename: string): Promise<void> {
  const token = localStorage.getItem("access_token");
  const separator = reportPath.includes("?") ? "&" : "?";
  const url = `${API_BASE_URL}${reportPath}${separator}export=pdf`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Could not download PDF report.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export async function fetchReportPdfBlob(reportPath: string): Promise<Blob> {
  const token = localStorage.getItem("access_token");
  const separator = reportPath.includes("?") ? "&" : "?";
  const url = `${API_BASE_URL}${reportPath}${separator}export=pdf`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Could not load PDF preview.");
  }

  return response.blob();
}
