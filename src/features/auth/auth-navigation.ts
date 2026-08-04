export function quotationIdFromNextPath(nextPath: string) {
  const match = /^\/quotes\/(quo_[a-z0-9_-]+)\/?$/i.exec(nextPath);
  return match?.[1] ?? null;
}
