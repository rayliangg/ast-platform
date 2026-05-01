type Position = { row: number; column: number };
type AstNode = {
  id: string;
  language: string;
  node_type: string;
  kind: string;
  name: string | null;
  docstring: string | null;
  range: { start: Position; end: Position };
  children: AstNode[];
};

type AstNodeInternal = AstNode & { _indent?: number };

export function parseWithFallback({ language, source }: { language: string; source: string }): AstNode {
  const normalizedLanguage = String(language ?? "").trim().toLowerCase();
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const classRegexes = classPatterns(normalizedLanguage);
  const functionRegexes = functionPatterns(normalizedLanguage);
  const nodes: AstNodeInternal[] = [];
  let currentClass: AstNodeInternal | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (currentClass && shouldCloseClassContext(normalizedLanguage, line, currentClass)) {
      currentClass = null;
    }

    const className = matchFirst(line, classRegexes);
    if (className) {
      const endRow = findEndRow(normalizedLanguage, lines, i);
      const classNode = createNode("class", className, normalizedLanguage, i + 1, endRow, endColumnAtRow(lines, endRow));
      classNode._indent = leadingSpaces(line);
      classNode.docstring = extractNodeDocstring(normalizedLanguage, lines, i, endRow, classNode._indent ?? 0);
      nodes.push(classNode);
      currentClass = classNode;
      continue;
    }

    const fnName = matchFirst(line, functionRegexes);
    if (fnName) {
      const endRow = findEndRow(normalizedLanguage, lines, i);
      const fnNode = createNode("function", fnName, normalizedLanguage, i + 1, endRow, endColumnAtRow(lines, endRow));
      fnNode.docstring = extractNodeDocstring(normalizedLanguage, lines, i, endRow, currentClass?._indent ?? 0);
      if (currentClass && belongsToClass(normalizedLanguage, line, currentClass)) currentClass.children.push(fnNode);
      else nodes.push(fnNode);
    }
  }

  const cleanedChildren = nodes.map(stripPrivateFields);
  return {
    id: `${normalizedLanguage}:file`,
    language: normalizedLanguage,
    node_type: "file",
    kind: "File",
    name: null,
    docstring: extractTopComment(normalizedLanguage, lines),
    range: {
      start: { row: 1, column: 1 },
      end: { row: Math.max(1, lines.length), column: 1 },
    },
    children: cleanedChildren,
  };
}

function findEndRow(language: string, lines: string[], startIdx: number): number {
  if (language === "python" || language === "ruby" || language === "r") {
    const baseIndent = leadingSpaces(lines[startIdx] ?? "");
    let endRow = startIdx + 1;
    for (let i = startIdx + 1; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (leadingSpaces(line) <= baseIndent) return endRow;
      endRow = i + 1;
    }
    return endRow;
  }

  if (usesBraceBlocks(language)) {
    let opened = 0;
    let seenOpening = false;
    let inBlockComment = false;
    for (let i = startIdx; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      const scanned = stripStringsAndComments(line, () => inBlockComment, (v) => (inBlockComment = v));
      for (const ch of scanned) {
        if (ch === "{") {
          opened += 1;
          seenOpening = true;
        } else if (ch === "}") {
          opened = Math.max(0, opened - 1);
        }
      }
      if (seenOpening && opened === 0) return i + 1;
    }
  }

  return startIdx + 1;
}

function usesBraceBlocks(language: string): boolean {
  return [
    "javascript",
    "typescript",
    "java",
    "csharp",
    "kotlin",
    "swift",
    "cpp",
    "c",
    "go",
    "rust",
    "php",
  ].includes(language);
}

function stripStringsAndComments(
  line: string,
  getInBlockComment: () => boolean,
  setInBlockComment: (value: boolean) => void
): string {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escape = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? "";
    const next = line[i + 1] ?? "";
    const inBlockComment = getInBlockComment();

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        setInBlockComment(false);
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === "/" && next === "/") break;
      if (ch === "/" && next === "*") {
        setInBlockComment(true);
        i += 1;
        continue;
      }
    }

    if (!inDouble && !inTemplate && ch === "'" && !escape) {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && ch === '"' && !escape) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === "`" && !escape) {
      inTemplate = !inTemplate;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate && (ch === "{" || ch === "}")) out += ch;
    escape = ch === "\\" && !escape;
    if (ch !== "\\") escape = false;
  }
  return out;
}

function endColumnAtRow(lines: string[], row: number): number {
  const line = lines[Math.max(0, row - 1)] ?? "";
  return Math.max(1, line.length + 1);
}

function extractNodeDocstring(
  language: string,
  lines: string[],
  startIdx: number,
  endRow: number,
  parentIndent: number
): string | null {
  if (language !== "python") return null;
  for (let i = startIdx + 1; i < Math.min(lines.length, endRow); i += 1) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed) continue;
    const indent = leadingSpaces(line);
    if (indent <= parentIndent) return null;
    if ((trimmed.startsWith('"""') && trimmed.endsWith('"""') && trimmed.length > 6) || (trimmed.startsWith("'''") && trimmed.endsWith("'''") && trimmed.length > 6)) {
      return trimmed.slice(3, -3).trim() || null;
    }
    return null;
  }
  return null;
}

function stripPrivateFields(node: AstNodeInternal): AstNode {
  const { _indent: _unused, children, ...rest } = node;
  void _unused;
  return {
    ...rest,
    children: children.map(stripPrivateFields),
  };
}

function belongsToClass(language: string, line: string, classNode: AstNodeInternal): boolean {
  if (language === "python" || language === "ruby" || language === "r") {
    return leadingSpaces(line) > (classNode._indent ?? 0);
  }
  return true;
}

function shouldCloseClassContext(language: string, line: string, classNode: AstNodeInternal): boolean {
  if (language === "python" || language === "ruby" || language === "r") {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return leadingSpaces(line) <= (classNode._indent ?? 0);
  }
  return /^\s*}\s*;?\s*$/.test(line);
}

function leadingSpaces(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function createNode(
  nodeType: "class" | "function",
  name: string,
  language: string,
  row: number,
  endRow: number,
  endColumn: number
): AstNodeInternal {
  return {
    id: `${language}:${nodeType}:${row}:${name}`,
    language,
    node_type: nodeType,
    kind: nodeType === "class" ? "Class" : "Function",
    name,
    docstring: null,
    range: {
      start: { row, column: 1 },
      end: { row: Math.max(row, endRow), column: endColumn },
    },
    children: [],
  };
}

function matchFirst(line: string, regexes: RegExp[]): string | null {
  for (const re of regexes) {
    const m = line.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function classPatterns(language: string): RegExp[] {
  switch (language) {
    case "python":
      return [/^\s*class\s+([A-Za-z_]\w*)\s*[:(]/];
    case "go":
      return [/^\s*type\s+([A-Za-z_]\w*)\s+struct\b/];
    case "rust":
      return [/^\s*(?:pub\s+)?struct\s+([A-Za-z_]\w*)\b/, /^\s*(?:pub\s+)?trait\s+([A-Za-z_]\w*)\b/];
    default:
      return [/^\s*(?:public|private|protected|internal|final|abstract|sealed|\s)*\s*class\s+([A-Za-z_]\w*)\b/];
  }
}

function functionPatterns(language: string): RegExp[] {
  switch (language) {
    case "python":
      return [/^\s*def\s+([A-Za-z_]\w*)\s*\(/];
    case "javascript":
    case "typescript":
      return [/^\s*function\s+([A-Za-z_]\w*)\s*\(/, /^\s*([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/];
    case "go":
      return [/^\s*func\s+([A-Za-z_]\w*)\s*\(/, /^\s*func\s*\([^)]*\)\s*([A-Za-z_]\w*)\s*\(/];
    case "rust":
      return [/^\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*)\s*\(/];
    case "java":
    case "csharp":
    case "kotlin":
    case "swift":
    case "cpp":
    case "c":
      return [/^\s*(?:public|private|protected|internal|static|virtual|override|final|\s)*\s*[A-Za-z_][\w<>\[\]?]*\s+([A-Za-z_]\w*)\s*\(/];
    case "php":
      return [/^\s*(?:public|private|protected)?\s*function\s+([A-Za-z_]\w*)\s*\(/];
    case "ruby":
      return [/^\s*def\s+([A-Za-z_]\w*[!?=]?)\b/];
    case "r":
      return [/^\s*([A-Za-z_]\w*)\s*<-\s*function\s*\(/];
    default:
      return [/^\s*function\s+([A-Za-z_]\w*)\s*\(/];
  }
}

function extractTopComment(language: string, lines: string[]): string | null {
  if (language === "python" && lines[0]?.trim().startsWith('"""')) {
    const first = lines[0].trim();
    if (first.endsWith('"""') && first.length > 6) return first.slice(3, -3);
  }
  const first = lines.find((l) => l.trim().length > 0)?.trim() ?? "";
  if (first.startsWith("//")) return first.replace(/^\/\//, "").trim();
  if (first.startsWith("#")) return first.replace(/^#/, "").trim();
  return null;
}
