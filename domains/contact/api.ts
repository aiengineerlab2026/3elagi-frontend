import { Platform } from "react-native";
import { API_BASE } from "@/constants/api";

export type ContactAttachment = {
  uri: string;
  mimeType: string;
  fileName: string;
  webFile?: File | Blob;
};

async function appendFile(
  formData: FormData,
  fieldName: string,
  file: ContactAttachment,
): Promise<void> {
  if (Platform.OS === "web") {
    if (file.webFile instanceof File) {
      formData.append(fieldName, file.webFile, file.fileName);
      return;
    }
    if (file.webFile instanceof Blob) {
      formData.append(fieldName, file.webFile, file.fileName);
      return;
    }
    const res = await fetch(file.uri);
    const blob = await res.blob();
    formData.append(fieldName, blob, file.fileName);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData.append(fieldName, {
    uri: file.uri,
    name: file.fileName,
    type: file.mimeType,
  } as any);
}

export async function submitContactMessage(input: {
  token: string;
  message: string;
  name?: string;
  email?: string;
  files?: ContactAttachment[];
}): Promise<void> {
  const formData = new FormData();
  formData.append("message", input.message.trim());
  if (input.name?.trim()) formData.append("name", input.name.trim());
  if (input.email?.trim()) formData.append("email", input.email.trim());

  for (const file of input.files ?? []) {
    await appendFile(formData, "files", file);
  }

  const res = await fetch(`${API_BASE}/contact`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
}
