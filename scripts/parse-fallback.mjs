export function parseWithFallback({ language, source }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const classRegexes = classPatterns(language);
  const functionRegexes = functionPatterns(language);
  const nodes = [];
  let currentClass = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (currentClass && shouldCloseClassContext(language, line, currentClass)) {
      currentClass = null;
    }
    const className = matchFirst(line, classRegexes);
    if (className) {
      const classNode = createNode("class", className, language, i + 1, line.length + 1);
      classNode._indent = leadingSpaces(line);
      nodes.push(classNode);
      currentClass = classNode;
      continue;
    }
    const fnName = matchFirst(line, functionRegexes);
    if (fnName) {
      const fnNode = createNode("function", fnName, language, i + 1, line.length + 1);
      if (currentClass && belongsToClass(language, line, currentClass)) currentClass.children.push(fnNode);
      else nodes.push(fnNode);
    }
  }

  const cleanedChildren = nodes.map(stripPrivateFields);
  return {
    id: `${language}:file`,
    language,
    node_type: "file",
    kind: "File",
    name: null,
    docstring: extractTopComment(language, lines),
    range: {
      start: { row: 1, column: 1 },
      end: { row: Math.max(1, lines.length), column: 1 },
    },
    children: cleanedChildren,
  };
}

function stripPrivateFields(node) {
  const { _indent, children, ...rest } = node;
  return {
    ...rest,
    children: children.map(stripPrivateFields),
  };
}

function belongsToClass(language, line, classNode) {
  if (language === "python" || language === "ruby" || language === "r") {
    return leadingSpaces(line) > (classNode._indent ?? 0);
  }
  return true;
}

function shouldCloseClassContext(language, line, classNode) {
  if (language === "python" || language === "ruby" || language === "r") {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return leadingSpaces(line) <= (classNode._indent ?? 0);
  }
  return /^\s*}\s*;?\s*$/.test(line);
}

function leadingSpaces(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function createNode(nodeType, name, language, row, endColumn) {
  return {
    id: `${language}:${nodeType}:${row}:${name}`,
    language,
    node_type: nodeType,
    kind: nodeType === "class" ? "Class" : "Function",
    name,
    docstring: null,
    range: {
      start: { row, column: 1 },
      end: { row, column: endColumn },
    },
    children: [],
  };
}

function matchFirst(line, regexes) {
  for (const re of regexes) {
    const m = line.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function classPatterns(language) {
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

function functionPatterns(language) {
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

function extractTopComment(language, lines) {
  if (language === "python" && lines[0]?.trim().startsWith('"""')) {
    const first = lines[0].trim();
    if (first.endsWith('"""') && first.length > 6) return first.slice(3, -3);
  }
  const first = lines.find((l) => l.trim().length > 0)?.trim() ?? "";
  if (first.startsWith("//")) return first.replace(/^\/\//, "").trim();
  if (first.startsWith("#")) return first.replace(/^#/, "").trim();
  return null;
}
