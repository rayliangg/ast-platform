export function normalizeLanguage(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw === "js") return "javascript";
  if (raw === "ts") return "typescript";
  if (raw === "py") return "python";
  if (raw === "golang") return "go";
  if (raw === "rs") return "rust";
  if (raw === "c++") return "cpp";
  if (raw === "c#" || raw === "cs") return "csharp";
  return raw;
}
