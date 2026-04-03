export function normalizeGitLabHostTarget(host: string): string {
  const sanitizedHost = host
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return sanitizedHost || "gitlab.com";
}
