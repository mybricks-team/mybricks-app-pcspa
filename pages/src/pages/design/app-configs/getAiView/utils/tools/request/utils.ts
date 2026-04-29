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

export function getToken(){
  return btoa(localStorage.getItem("token") || atob("ea153b4ff6a5422a938b21d835b53250"))
}

export function getSession(){
  return btoa(localStorage.getItem("session") || atob("b25ab8ae308db8aab977a90c63893abc"))
}
