export class AbortError extends Error {
  constructor() {
    super("Aborted");
    this.name = "AbortError";
  }
}

export function buildUrl(baseUrl: string, url: string) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function isAbortError(error: unknown) {
  return (
    error instanceof AbortError ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.message.toLowerCase().includes("aborted"))
  );
}

export function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
