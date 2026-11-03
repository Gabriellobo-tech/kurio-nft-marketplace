export function safeReturn(value: unknown): string {
  return typeof value === "string" &&
    /^\/(?!\/)/.test(value) &&
    !value.includes("\\")
    ? value
    : "/checkout";
}
