/** Summary for a folder opened in the UI (before / after per-file parse). */
export type DirectoryListingMetadata = {
  listing_kind: "open_folder";
  /** Top-level folder name (first segment of webkitRelativePath). */
  root_relative_path: string;
  /** Number of code files in the folder. */
  file_count: number;
  /** Number of intermediate folder nodes in the tree (excluding root). */
  directory_node_count: number;
  /** Basename extension (e.g. ".py") or "(none)" -> count. */
  extension_counts: Record<string, number>;
  /** Parsed object from `<root>/directory.json` when that file exists and contains valid JSON. */
  manifest?: Record<string, unknown> | null;
};

export type AstNode = {
  id: string;
  language: string;
  node_type: string;
  kind: string;
  name: string | null;
  docstring: string | null;
  range: {
    start: { row: number; column: number };
    end: { row: number; column: number };
  };
  children: AstNode[];
  /**
   * Relative path from the opened directory root (same as File.webkitRelativePath when available).
   * Used in directory mode; not a source docstring.
   */
  path?: string | null;
  /** Present only on the synthetic directory root when a folder is opened in the UI. */
  directory_metadata?: DirectoryListingMetadata | null;
  /**
   * When `language === "directory"` and `node_type === "directory"`, parsed JSON from
   * `<this folder>/directory.json` if present (any depth under the opened root).
   */
  folder_manifest?: Record<string, unknown> | null;
};
