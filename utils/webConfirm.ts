export function webConfirm(title: string, message: string): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return false;
  }

  return window.confirm(`${title}\n\n${message}`);
}
