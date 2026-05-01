import { useRef, useMemo, useState, useEffect } from "react";
import { AstTree } from "./components/AstTree";
import type { AstNode, DirectoryListingMetadata } from "./types";
import "./App.css";
import { DEMO_BY_LANGUAGE, detectLanguage, PARSE_SUPPORTED_LANGUAGES, TOP_10_LANGUAGES } from "./language";

/** If present at `<openedRoot>/directory.json`, its JSON object is stored on the tree root metadata. */
const DIRECTORY_MANIFEST_FILENAME = "directory.json";
const parseApiBaseRaw = import.meta.env.VITE_PARSE_API_BASE?.trim();
const defaultParseApiBase =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8787"
    : "https://ast-platform-parse-api.astplatform-ray.workers.dev";
const PARSE_API_BASE = (parseApiBaseRaw && parseApiBaseRaw.length > 0 ? parseApiBaseRaw : defaultParseApiBase).replace(/\/+$/, "");

/** Direct child file name → language chip (non-recursive). */
const EXT_LANGUAGE: Record<string, { id: string; label: string; icon: string }> = {
  ".py": { id: "python", label: "Python", icon: "🐍" },
  ".js": { id: "javascript", label: "JavaScript", icon: "JS" },
  ".ts": { id: "typescript", label: "TypeScript", icon: "TS" },
  ".go": { id: "go", label: "Go", icon: "Go" },
  ".rs": { id: "rust", label: "Rust", icon: "🦀" },
  ".java": { id: "java", label: "Java", icon: "☕" },
  ".cpp": { id: "cpp", label: "C++", icon: "C++" },
  ".cc": { id: "cpp", label: "C++", icon: "C++" },
  ".cxx": { id: "cpp", label: "C++", icon: "C++" },
  ".hpp": { id: "cpp", label: "C++", icon: "C++" },
  ".hxx": { id: "cpp", label: "C++", icon: "C++" },
  ".h": { id: "c", label: "C/C++", icon: "H" },
  ".c": { id: "c", label: "C", icon: "C" },
  ".cs": { id: "csharp", label: "C#", icon: "#" },
  ".php": { id: "php", label: "PHP", icon: "PHP" },
  ".kt": { id: "kotlin", label: "Kotlin", icon: "Kt" },
  ".swift": { id: "swift", label: "Swift", icon: "🐦" },
  ".dart": { id: "dart", label: "Dart", icon: "◆" },
  ".rb": { id: "ruby", label: "Ruby", icon: "💎" },
  ".r": { id: "r", label: "R", icon: "R" },
  ".json": { id: "json", label: "JSON", icon: "{}" },
};

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  ruby: "Ruby",
  r: "R",
  json: "JSON",
  directory: "Directory",
  unknown: "Unknown",
};

function languageLabel(id: string): string {
  return LANGUAGE_LABEL[id] ?? (id ? id[0].toUpperCase() + id.slice(1) : "Unknown");
}

function extensionOfBasename(name: string | null): string {
  if (!name) return "";
  const i = name.lastIndexOf(".");
  if (i <= 0 || i === name.length - 1) return "";
  return name.slice(i).toLowerCase();
}

function displayFromParseLanguageId(id: string): { label: string; icon: string } | undefined {
  for (const v of Object.values(EXT_LANGUAGE)) {
    if (v.id === id) return { label: v.label, icon: v.icon };
  }
  return undefined;
}

/** Parser top `file` nodes often omit `name`; use `path` tail or opened file basename for Inspector / Copy. */
function inspectorNodeDisplayName(node: AstNode, loadedFileName: string | null): string | null {
  if (node.name) return node.name;
  if (node.node_type !== "file") return null;
  if (node.path) {
    const parts = node.path.split("/").filter(Boolean);
    if (parts.length) return parts[parts.length - 1] ?? null;
  }
  if (loadedFileName) {
    const parts = loadedFileName.replace(/\\/g, "/").split("/").filter(Boolean);
    if (parts.length) return parts[parts.length - 1] ?? loadedFileName;
    return loadedFileName;
  }
  return null;
}

/** Inspector / copy: language for a directory-mode file row or parsed file (from `language` field or extension). */
function fileLanguageDisplay(node: AstNode, displayName: string | null): { label: string; icon: string } | null {
  if (node.node_type !== "file") return null;
  const lid = node.language;
  if (lid && lid !== "directory") {
    const d = displayFromParseLanguageId(lid);
    if (d) return d;
    return { label: lid, icon: "📄" };
  }
  const ext = extensionOfBasename(displayName ?? node.name);
  const byExt = EXT_LANGUAGE[ext];
  if (byExt) return { label: byExt.label, icon: byExt.icon };
  if (ext) return { label: ext.replace(/^\./, ""), icon: "📄" };
  return { label: "Unknown", icon: "?" };
}

type DirectLangGroup = { id: string; label: string; icon: string; files: string[] };

function directChildFolderStats(node: AstNode): {
  fileCount: number;
  dirCount: number;
  langs: DirectLangGroup[];
} {
  const files = node.children.filter((c) => c.node_type === "file");
  const dirs = node.children.filter((c) => c.node_type === "directory");
  const byId = new Map<string, DirectLangGroup>();
  for (const f of files) {
    const ext = extensionOfBasename(f.name);
    const meta = EXT_LANGUAGE[ext];
    if (!meta) continue;
    const cur = byId.get(meta.id);
    const nm = f.name ?? "";
    if (cur) cur.files.push(nm);
    else byId.set(meta.id, { id: meta.id, label: meta.label, icon: meta.icon, files: [nm] });
  }
  const langs = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
  return { fileCount: files.length, dirCount: dirs.length, langs };
}

/** Summary text for the selected folder row: root uses tree metadata; nested dirs use `folder_manifest`. */
function manifestSummaryForDirectoryInspector(selected: AstNode, tree: AstNode | null): string | null {
  if (!tree || tree.language !== "directory" || selected.node_type !== "directory") return null;
  if (selected.path === tree.path) {
    const m = tree.directory_metadata?.manifest;
    if (m && typeof m.summary === "string") return m.summary;
    return null;
  }
  const fm = selected.folder_manifest;
  if (fm && typeof fm.summary === "string") return fm.summary;
  return null;
}

function manifestRootSummary(manifest: Record<string, unknown> | null): string | null {
  if (manifest && typeof manifest.summary === "string") return manifest.summary;
  return null;
}

/** Keys in `directory.json` `paths` are relative to the opened folder (e.g. `backend/x.py`). */
function manifestPathDescriptions(manifest: Record<string, unknown> | null): Map<string, string> {
  const m = new Map<string, string>();
  if (!manifest || typeof manifest.paths !== "object" || manifest.paths === null) return m;
  const paths = manifest.paths as Record<string, unknown>;
  for (const [k, v] of Object.entries(paths)) {
    if (typeof v === "string") m.set(k, v);
  }
  return m;
}

function webkitRelativePathOf(file: File): string {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, "/");
}

/** Any depth: omit from tree / listing / file picker state (root manifest is still read separately). */
function isDirectoryManifestFile(file: File): boolean {
  const base = webkitRelativePathOf(file).split("/").pop() || "";
  return base.toLowerCase() === DIRECTORY_MANIFEST_FILENAME.toLowerCase();
}

async function collectFolderManifestsFromAllFiles(allFiles: File[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const f of allFiles) {
    if (!isDirectoryManifestFile(f)) continue;
    const rel = webkitRelativePathOf(f);
    const parts = rel.split("/").filter(Boolean);
    if (parts.length < 2) continue;
    const folderPath = parts.slice(0, -1).join("/");
    try {
      const raw = await f.text();
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        map.set(folderPath, parsed as Record<string, unknown>);
      }
    } catch {
      /* skip invalid */
    }
  }
  return map;
}

function extensionKeyFromPath(relativePath: string): string {
  const base = relativePath.split("/").pop() || relativePath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "(none)";
  return base.slice(dot).toLowerCase();
}

function buildExtensionCounts(files: File[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const p = webkitRelativePathOf(file);
    const k = extensionKeyFromPath(p);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function buildDirectoryTree(
  files: File[],
  manifest: Record<string, unknown> | null,
  folderManifests: Map<string, Record<string, unknown>>,
): AstNode {
  const firstPath = webkitRelativePathOf(files[0]);
  const rootName = firstPath.split("/")[0] || "directory";
  let directoryNodeCount = 0;
  const rootFolderManifest = folderManifests.get(rootName) ?? manifest;
  const rootSummary = manifestRootSummary(rootFolderManifest);
  const pathDescriptions = manifestPathDescriptions(manifest);

  const directory_metadata: DirectoryListingMetadata = {
    listing_kind: "open_folder",
    root_relative_path: rootName,
    file_count: files.length,
    directory_node_count: 0,
    extension_counts: buildExtensionCounts(files),
    manifest: manifest ?? null,
  };

  const root: AstNode = {
    id: `directory:${rootName}`,
    language: "directory",
    node_type: "directory",
    kind: "Directory",
    name: rootName,
    docstring: rootSummary,
    path: rootName,
    directory_metadata,
    folder_manifest: rootFolderManifest ?? null,
    range: { start: { row: 1, column: 1 }, end: { row: files.length, column: 1 } },
    children: [],
  };

  const byId = new Map<string, AstNode>([[root.id, root]]);
  const sorted = [...files].sort((a, b) => {
    const ap = webkitRelativePathOf(a);
    const bp = webkitRelativePathOf(b);
    return ap.localeCompare(bp);
  });

  sorted.forEach((file, index) => {
    const relativePath = webkitRelativePathOf(file);
    const parts = relativePath.split("/").filter(Boolean);
    let parentId = root.id;
    for (let i = 1; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const nodeId = `${parentId}/${part}`;
      if (!byId.has(nodeId)) {
        const pathStr = parts.slice(0, i + 1).join("/");
        if (!isFile) directoryNodeCount += 1;
        const relFromOpenRoot =
          pathStr.startsWith(`${rootName}/`) ? pathStr.slice(rootName.length + 1) : pathStr;
        const pathBlurb = isFile ? pathDescriptions.get(relFromOpenRoot) ?? null : null;
        const localDirManifest = !isFile ? folderManifests.get(pathStr) ?? null : null;
        const node: AstNode = {
          id: nodeId,
          language: "directory",
          node_type: isFile ? "file" : "directory",
          kind: isFile ? "File" : "Directory",
          name: part,
          docstring: isFile ? pathBlurb : manifestRootSummary(localDirManifest),
          path: pathStr,
          folder_manifest: isFile ? undefined : localDirManifest,
          range: { start: { row: index + 1, column: 1 }, end: { row: index + 1, column: 1 } },
          children: [],
        };
        byId.get(parentId)?.children.push(node);
        byId.set(nodeId, node);
      }
      parentId = nodeId;
    }
  });

  directory_metadata.directory_node_count = directoryNodeCount;
  return root;
}

/** Synthetic `$ ls`-style view for the selected folder path (directory mode). */
function buildDirectoryListing(directoryPath: string, files: File[]): string {
  const norm = directoryPath.replace(/\/+$/, "");
  const prefix = `${norm}/`;
  const paths = files
    .map((file) => webkitRelativePathOf(file))
    .filter((p) => p === norm || p.startsWith(prefix));

  if (paths.length === 0) return `$ ls ${norm}\n(empty)\n`;

  const childKind = new Map<string, "dir" | "file">();
  for (const p of paths) {
    if (p === norm) continue;
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    const first = rest.split("/")[0];
    if (!first) continue;
    const afterFirst = rest.slice(first.length + 1);
    if (afterFirst.length > 0) {
      childKind.set(first, "dir");
    } else {
      const prev = childKind.get(first);
      childKind.set(first, prev === "dir" ? "dir" : "file");
    }
  }

  const lines = [...childKind.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([name, kind]) => (kind === "dir" ? `${name}/` : name));
  return `$ ls ${norm}\n${lines.join("\n")}\n`;
}

function sliceSourceByRange(fullSource: string, range: AstNode["range"]): string {
  if (!range?.start || !range?.end) return fullSource;
  const lines = fullSource.replace(/\r\n/g, "\n").split("\n");
  const startRow = Math.max(1, range.start.row);
  const endRow = Math.max(startRow, range.end.row);
  const picked = lines.slice(startRow - 1, endRow);
  if (picked.length === 0) return fullSource;

  const firstIdx = Math.max(0, range.start.column - 1);
  const lastIdx = Math.max(0, range.end.column - 1);
  if (picked.length === 1) {
    return `${picked[0].slice(firstIdx, Math.max(firstIdx + 1, lastIdx))}\n`;
  }

  picked[0] = picked[0].slice(firstIdx);
  picked[picked.length - 1] = picked[picked.length - 1].slice(0, Math.max(1, lastIdx));
  return `${picked.join("\n")}\n`;
}

function cloneNode(node: AstNode): AstNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
  };
}

function attachParsedFileAst(root: AstNode, relativePath: string, parsedRoot: AstNode): AstNode {
  const nextRoot = cloneNode(root);
  const visit = (node: AstNode): boolean => {
    if (node.node_type === "file" && node.path === relativePath) {
      node.children = parsedRoot.children.map(cloneNode);
      node.kind = "File";
      node.language = parsedRoot.language;
      return true;
    }
    return node.children.some(visit);
  };
  visit(nextRoot);
  return nextRoot;
}

function isAstNodeLike(value: unknown): value is AstNode {
  if (!value || typeof value !== "object") return false;
  const n = value as Partial<AstNode>;
  return (
    typeof n.id === "string" &&
    typeof n.language === "string" &&
    typeof n.node_type === "string" &&
    typeof n.kind === "string" &&
    Array.isArray(n.children) &&
    !!n.range &&
    typeof n.range.start?.row === "number" &&
    typeof n.range.start?.column === "number" &&
    typeof n.range.end?.row === "number" &&
    typeof n.range.end?.column === "number"
  );
}

export default function App() {
  const [source, setSource] = useState(DEMO_BY_LANGUAGE.python);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [openedDirectoryRoot, setOpenedDirectoryRoot] = useState<string | null>(null);
  const [directoryFiles, setDirectoryFiles] = useState<File[]>([]);
  const [selectedDirectoryFile, setSelectedDirectoryFile] = useState<string | null>(null);
  const [directoryTree, setDirectoryTree] = useState<AstNode | null>(null);
  const [tree, setTree] = useState<AstNode | null>(null);
  const [selected, setSelected] = useState<AstNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectorCopied, setInspectorCopied] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<"summary" | "json">("summary");
  const [directoryLangFocus, setDirectoryLangFocus] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const detectedLanguage = useMemo(() => detectLanguage(source), [source]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const directoryInputRef = useRef<HTMLInputElement | null>(null);

  function resetLoadedContext() {
    setOpenedDirectoryRoot(null);
    setDirectoryFiles([]);
    setDirectoryTree(null);
    setSelectedDirectoryFile(null);
    setTree(null);
    setSelected(null);
    setError(null);
  }

  const sourceView = useMemo(() => {
    if (!selected) return source;
    if (selected.node_type === "file" || selected.node_type === "directory") return source;
    if (!selected.range) return source;
    return sliceSourceByRange(source, selected.range);
  }, [source, selected]);

  const demoLanguages = useMemo(() => TOP_10_LANGUAGES.filter((lang) => lang in DEMO_BY_LANGUAGE), []);

  const inspectorLabelName = useMemo(() => {
    if (!selected) return null;
    return inspectorNodeDisplayName(selected, loadedFileName);
  }, [selected, loadedFileName]);

  useEffect(() => {
    setDirectoryLangFocus(null);
  }, [selected?.id]);

  useEffect(() => {
    try {
      const key = "ast-ui-onboarding-dismissed";
      const seen = sessionStorage.getItem(key) === "1";
      if (!seen) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  function dismissOnboarding() {
    setShowOnboarding(false);
    try {
      sessionStorage.setItem("ast-ui-onboarding-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  function nextOnboardingStep() {
    if (onboardingStep >= 2) {
      dismissOnboarding();
      return;
    }
    setOnboardingStep((n) => n + 1);
  }

  function handleTreeSelect(node: AstNode) {
    setSelected(node);
    if (directoryFiles.length === 0) return;
    const nodePath = node.path ?? "";
    if (node.node_type === "directory" && nodePath) {
      setSelectedDirectoryFile(null);
      setSource(buildDirectoryListing(nodePath, directoryFiles));
      return;
    }
    if (node.node_type === "file" && nodePath) {
      const file = directoryFiles.find((f) => webkitRelativePathOf(f) === nodePath);
      if (file) {
        void loadDirectoryFile(file);
      }
    }
  }

  async function parseAst() {
    setError(null);
    setSelected(null);
    if (directoryTree && !selectedDirectoryFile) {
      setError("Select a file in the tree before Parse AST (directory mode).");
      return;
    }
    if (!PARSE_SUPPORTED_LANGUAGES.has(detectedLanguage)) {
      setError(`Parse not supported yet for '${detectedLanguage}'.`);
      setTree(null);
      return;
    }
    try {
      const res = await fetch(`${PARSE_API_BASE}/parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: detectedLanguage, source }),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const payload = (await res.json()) as unknown;
      if (!isAstNodeLike(payload)) {
        setError("Parse API returned invalid payload (expected AST node).");
        return;
      }
      const json = payload;
      if (directoryTree && selectedDirectoryFile) {
        const merged = attachParsedFileAst(directoryTree, selectedDirectoryFile, json);
        setDirectoryTree(merged);
        setTree(merged);
        return;
      }
      setTree(json);
    } catch (e) {
      setError(`Parse service unavailable: ${String(e)}`);
    }
  }

  async function copyInspectorText() {
    if (!selected) return;
    try {
      const text =
        inspectorMode === "json"
          ? JSON.stringify(selected, null, 2)
          : JSON.stringify(
              {
                type: selected.node_type,
                name: inspectorLabelName,
                ...(selected.node_type === "file"
                  ? (() => {
                      const fl = fileLanguageDisplay(selected, inspectorLabelName);
                      return fl ? { language: fl.label } : {};
                    })()
                  : {}),
                path: selected.path ?? null,
                summary: selected.docstring,
                directory_metadata: selected.directory_metadata ?? null,
                range: selected.range,
              },
              null,
              2
            );
      await navigator.clipboard.writeText(text);
      setInspectorCopied(true);
      setTimeout(() => setInspectorCopied(false), 1200);
    } catch (e) {
      setError(`Copy failed: ${String(e)}`);
    }
  }

  async function handleFilePicked(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      setSource(text);
      setLoadedFileName(file.name);
      resetLoadedContext();
    } catch (e) {
      setError(`Failed to read file: ${String(e)}`);
    }
  }

  async function handleDirectoryPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const allFiles = Array.from(files);
    const allowed = allFiles.filter((f) => /\.(json|py|js|ts|go|rs|java|cpp|cc|cxx|hpp|hxx|h|c|cs|php|kt|swift|dart|rb|r)$/i.test(f.name));
    if (allowed.length === 0) {
      setError("No supported code or manifest files found in directory.");
      return;
    }
    const firstPath = webkitRelativePathOf(allowed[0]);
    const rootName = firstPath.split("/")[0] || "directory";
    const visible = allowed.filter((f) => !isDirectoryManifestFile(f));
    if (visible.length === 0) {
      setError("No supported code files found in directory (only manifest).");
      return;
    }
    setDirectoryFiles(visible);
    const folderManifests = await collectFolderManifestsFromAllFiles(allFiles);
    const manifest = folderManifests.get(rootName) ?? null;
    const directoryTree = buildDirectoryTree(visible, manifest, folderManifests);
    setOpenedDirectoryRoot(rootName);
    setDirectoryTree(directoryTree);
    setTree(directoryTree);
    setSelected(directoryTree);
    setSource(buildDirectoryListing(rootName, visible));
    setLoadedFileName(null);
    setSelectedDirectoryFile(null);
  }

  async function loadDirectoryFile(file: File) {
    try {
      const text = await file.text();
      const relativePath = webkitRelativePathOf(file);
      setSource(text);
      setLoadedFileName(relativePath);
      setSelectedDirectoryFile(relativePath);
      setError(null);
    } catch (e) {
      setError(`Failed to read file: ${String(e)}`);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-left">
          <p className="app-eyebrow">Universal AST Workbench</p>
          <h1>Code Structure Studio</h1>
          <p className="hero-subtitle">Parse and inspect class/function hierarchies across languages.</p>
        </div>
        <div className="hero-right">
          <div className="status-chip">
            <span className="status-dot" />
            {languageLabel(detectedLanguage)}
          </div>
          <button className="primary-btn" onClick={parseAst}>
            Parse AST
          </button>
        </div>
      </header>
      {showOnboarding && (
        <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="quick start">
          <div className="onboarding-modal">
            <div className="onboarding-head">
              <strong>Quick tips</strong>
              <button className="tiny-btn" onClick={dismissOnboarding}>
                Close
              </button>
            </div>
            <div className="onboarding-grid-single">
              {onboardingStep === 0 && (
                <div className="onboarding-card onboarding-card-active">
                  <span className="onboarding-card-title">1. Multi-language</span>
                  <span className="onboarding-card-text">
                    Parse AST across Python, TS/JS, Go, Rust, Java and more.
                  </span>
                </div>
              )}
              {onboardingStep === 1 && (
                <div className="onboarding-card onboarding-card-active">
                  <span className="onboarding-card-title">2. Open File</span>
                  <span className="onboarding-card-text">
                    Load one source file and inspect its structure fast.
                  </span>
                  <button className="tiny-btn onboarding-inline-btn" onClick={() => fileInputRef.current?.click()}>
                    Try Open File
                  </button>
                </div>
              )}
              {onboardingStep === 2 && (
                <div className="onboarding-card onboarding-card-active">
                  <span className="onboarding-card-title">3. Open Directory</span>
                  <span className="onboarding-card-text">
                    Explore folder tree, language chips and directory summaries.
                  </span>
                  <button
                    className="tiny-btn onboarding-inline-btn"
                    onClick={() => directoryInputRef.current?.click()}
                  >
                    Try Open Directory
                  </button>
                </div>
              )}
            </div>
            <div className="onboarding-actions">
              <button className="primary-btn" onClick={nextOnboardingStep}>
                Got it {onboardingStep + 1}/3
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="demo-bar">
        <span>Load Demo:</span>
        <div className="demo-buttons">
          {demoLanguages.map((lang) => (
            <button
              key={lang}
              className={`demo-btn ${lang === detectedLanguage ? "demo-btn-active" : ""}`}
              onClick={() => {
                setSource(DEMO_BY_LANGUAGE[lang]);
                setLoadedFileName(null);
                resetLoadedContext();
              }}
            >
              {languageLabel(lang)}
            </button>
          ))}
          <button
            className="demo-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Open File
          </button>
          <button
            className="demo-btn"
            onClick={() => directoryInputRef.current?.click()}
          >
            Open Directory
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            accept=".py,.js,.ts,.go,.rs,.java,.cpp,.cc,.cxx,.hpp,.hxx,.h,.c,.cs,.php,.kt,.swift,.dart,.rb,.r,.json,.txt"
            onChange={(e) => void handleFilePicked(e.target.files?.[0] ?? null)}
          />
          <input
            ref={directoryInputRef}
            type="file"
            style={{ display: "none" }}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore non-standard but supported in Chromium-based browsers
            webkitdirectory="true"
            onChange={(e) => void handleDirectoryPicked(e.target.files)}
          />
        </div>
        <div className="demo-bar-chips">
          {openedDirectoryRoot ? (
            <span className="chip">Open Directory: {openedDirectoryRoot}</span>
          ) : (
            loadedFileName && <span className="chip">Open File: {loadedFileName}</span>
          )}
        </div>
      </section>

      <div className="layout-grid">
        <section className="panel source-panel">
          <div className="panel-title-row">
            <h3>Source Code</h3>
            <div className="panel-actions">
              <span className="chip">Auto Detect</span>
            </div>
          </div>
          <textarea
            className="source-input"
            value={sourceView}
            onChange={(e) => setSource(e.target.value)}
            rows={24}
            spellCheck={false}
            readOnly={Boolean(selected && !["file", "directory"].includes(selected.node_type))}
          />
        </section>

        <section className="panel tree-panel">
          <div className="panel-title-row">
            <h3>Tree View</h3>
            <span className="chip">{tree ? "Parsed" : "Idle"}</span>
          </div>
          <div className="tree-container">
            {tree ? <AstTree node={tree} onSelect={handleTreeSelect} selectedId={selected?.id} /> : "No AST yet"}
          </div>
        </section>

        <section className="panel side-panel">
          <div className="panel-title-row">
            <h3>Inspector</h3>
            <div className="panel-actions">
              <div className="mode-toggle">
                <button
                  className={`tiny-btn ${inspectorMode === "summary" ? "tiny-btn-active" : ""}`}
                  onClick={() => setInspectorMode("summary")}
                >
                  Summary
                </button>
                <button
                  className={`tiny-btn ${inspectorMode === "json" ? "tiny-btn-active" : ""}`}
                  onClick={() => setInspectorMode("json")}
                >
                  JSON
                </button>
              </div>
              <button className="tiny-btn" onClick={() => void copyInspectorText()} disabled={!selected}>
                {inspectorCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="inspector-box">
            {selected ? (
              <>
                {inspectorMode !== "summary" && (
                  <div className="inspector-title">
                    {selected.kind}
                    {inspectorLabelName ? ` (${inspectorLabelName})` : ""}
                  </div>
                )}
                {inspectorMode !== "summary" && selected.path && (
                  <p className="inspector-path-line">
                    <span className="inspector-label">Path</span>{" "}
                    <code className="inspector-path-code">{selected.path}</code>
                  </p>
                )}
                {inspectorMode !== "summary" &&
                  selected.docstring &&
                  selected.node_type !== "file" &&
                  selected.node_type !== "class" &&
                  selected.node_type !== "function" && (
                    <p className="inspector-doc">{selected.docstring}</p>
                  )}
                {inspectorMode === "summary" ? (
                  selected.language === "directory" && selected.node_type === "directory" ? (
                    <div className="inspector-grid">
                      {(() => {
                        const { fileCount, dirCount, langs } = directChildFolderStats(selected);
                        const summaryText = manifestSummaryForDirectoryInspector(selected, tree);
                        return (
                          <>
                            <div className="inspector-row">
                              <span>Type</span>
                              <strong>{selected.node_type}</strong>
                            </div>
                            <div className="inspector-row">
                              <span>Name</span>
                              <strong>{selected.name ?? "(anonymous)"}</strong>
                            </div>
                            <div className="inspector-row inspector-row-span">
                              <span>Languages</span>
                              <div className="inspector-lang-chips">
                                {langs.length === 0 ? (
                                  <span className="inspector-lang-empty">—</span>
                                ) : (
                                  langs.map((g) => (
                                    <button
                                      key={g.id}
                                      type="button"
                                      className={`inspector-lang-chip ${directoryLangFocus === g.id ? "inspector-lang-chip-active" : ""}`}
                                      title={`${g.label}: ${g.files.join(", ")}`}
                                      onClick={() =>
                                        setDirectoryLangFocus((prev) => (prev === g.id ? null : g.id))
                                      }
                                    >
                                      <span className="inspector-lang-icon" aria-hidden>
                                        {g.icon}
                                      </span>
                                      <span className="inspector-lang-label">{g.label}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                              {directoryLangFocus && (
                                <p className="inspector-lang-detail">
                                  {langs.find((x) => x.id === directoryLangFocus)?.files.join(", ") ?? ""}
                                </p>
                              )}
                            </div>
                            <div className="inspector-row inspector-row-span">
                              <span>Summary</span>
                              {summaryText ? (
                                <p className="inspector-directory-summary-only">{summaryText}</p>
                              ) : (
                                <span className="inspector-lang-empty">—</span>
                              )}
                            </div>
                            <div className="inspector-row">
                              <span>Files</span>
                              <strong>{fileCount}</strong>
                            </div>
                            <div className="inspector-row">
                              <span>Directories</span>
                              <strong>{dirCount}</strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="inspector-grid">
                      <div className="inspector-row">
                        <span>Type</span>
                        <strong>{selected.node_type}</strong>
                      </div>
                      <div className="inspector-row">
                        <span>Name</span>
                        <strong>{inspectorLabelName ?? "(anonymous)"}</strong>
                      </div>
                      {selected.node_type === "file" &&
                        (() => {
                          const fl = fileLanguageDisplay(selected, inspectorLabelName);
                          if (!fl) return null;
                          return (
                            <div className="inspector-row">
                              <span>Languages</span>
                              <strong className="inspector-file-lang">
                                <span className="inspector-lang-icon" aria-hidden>
                                  {fl.icon}
                                </span>
                                {fl.label}
                              </strong>
                            </div>
                          );
                        })()}
                      {(selected.node_type === "class" ||
                        selected.node_type === "function" ||
                        selected.node_type === "file") && (
                        <div className="inspector-row inspector-row-span">
                          <span>Summary</span>
                          {selected.docstring ? (
                            <p className="inspector-doc inspector-doc-grid">{selected.docstring}</p>
                          ) : (
                            <span className="inspector-lang-empty">—</span>
                          )}
                        </div>
                      )}
                      <div className="inspector-row">
                        <span>Start</span>
                        <strong>
                          {selected.range?.start
                            ? `${selected.range.start.row}:${selected.range.start.column}`
                            : "—"}
                        </strong>
                      </div>
                      <div className="inspector-row">
                        <span>End</span>
                        <strong>
                          {selected.range?.end ? `${selected.range.end.row}:${selected.range.end.column}` : "—"}
                        </strong>
                      </div>
                    </div>
                  )
                ) : (
                  <pre>{JSON.stringify(selected, null, 2)}</pre>
                )}
              </>
            ) : (
              "Select a node from tree"
            )}
          </div>
        </section>
      </div>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
