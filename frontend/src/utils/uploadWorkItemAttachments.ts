import api from "../api/client";

export async function uploadWorkItemAttachments(
  kind: "tasks" | "bugs",
  itemId: number,
  files: File[]
): Promise<void> {
  for (const file of files) {
    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/${kind}/${itemId}/attachments/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}
