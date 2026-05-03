use serde::Serialize;
use tree_sitter::{Language, Node, Parser};

#[derive(Debug, Clone, Serialize)]
pub struct Position {
    pub row: usize,
    pub column: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct Range {
    pub start: Position,
    pub end: Position,
}

#[derive(Debug, Clone, Serialize)]
pub struct AstNode {
    pub id: String,
    pub language: String,
    pub node_type: String,
    pub kind: String,
    pub name: Option<String>,
    pub docstring: Option<String>,
    pub range: Range,
    pub children: Vec<AstNode>,
}

pub fn parse_to_ast(language: &str, source: &str) -> Result<AstNode, String> {
    let ts_language = resolve_language(language)?;
    let mut parser = Parser::new();
    parser
        .set_language(&ts_language)
        .map_err(|e| format!("failed to set language: {e}"))?;

    let tree = parser
        .parse(source, None)
        .ok_or_else(|| "failed to parse source".to_string())?;

    let root = tree.root_node();
    let start = root.start_position();
    let end = root.end_position();
    let range = Range {
        start: Position {
            row: start.row + 1,
            column: start.column + 1,
        },
        end: Position {
            row: end.row + 1,
            column: end.column + 1,
        },
    };

    Ok(AstNode {
        id: format!("{}:file", language),
        language: language.to_string(),
        node_type: "file".to_string(),
        kind: "File".to_string(),
        name: None,
        docstring: extract_root_docstring(root, source, language),
        range,
        children: postprocess_children(language, collect_relevant_children(root, source, language)),
    })
}

fn resolve_language(language: &str) -> Result<Language, String> {
    match language {
        "python" => Ok(tree_sitter_python::LANGUAGE.into()),
        "javascript" | "js" => Ok(tree_sitter_javascript::LANGUAGE.into()),
        "typescript" | "ts" => Ok(tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()),
        "go" | "golang" => Ok(tree_sitter_go::LANGUAGE.into()),
        "rust" | "rs" => Ok(tree_sitter_rust::LANGUAGE.into()),
        "java" => Ok(tree_sitter_java::LANGUAGE.into()),
        "cpp" | "c++" => Ok(tree_sitter_cpp::LANGUAGE.into()),
        _ => Err(format!("unsupported language: {language}")),
    }
}

fn map_node(node: Node, source: &str, language: &str) -> AstNode {
    let raw_node_type = node.kind().to_string();
    let start = node.start_position();
    let end = node.end_position();
    let range = Range {
        start: Position {
            row: start.row + 1,
            column: start.column + 1,
        },
        end: Position {
            row: end.row + 1,
            column: end.column + 1,
        },
    };

    let children = collect_relevant_children(node, source, language);

    AstNode {
        id: format!(
            "{}:{}:{}:{}:{}",
            language, raw_node_type, range.start.row, range.start.column, range.end.row
        ),
        language: language.to_string(),
        kind: normalize_kind(&raw_node_type).to_string(),
        name: extract_name(node, source),
        docstring: extract_docstring(node, source, language),
        node_type: normalize_node_type(&raw_node_type).to_string(),
        range,
        children,
    }
}

fn collect_relevant_children(node: Node, source: &str, language: &str) -> Vec<AstNode> {
    let mut cursor = node.walk();
    let mut relevant = Vec::new();

    for child in node.children(&mut cursor) {
        if let Some(mapped) = map_relevant_node(child, source, language) {
            relevant.push(mapped);
            continue;
        }

        // Promote nested class/function nodes when intermediate syntax nodes are filtered out.
        relevant.extend(collect_relevant_children(child, source, language));
    }

    relevant
}

fn map_relevant_node(node: Node, source: &str, language: &str) -> Option<AstNode> {
    let kind = normalize_kind(node.kind());
    if kind != "Class" && kind != "Function" {
        return None;
    }
    Some(map_node(node, source, language))
}

fn postprocess_children(language: &str, children: Vec<AstNode>) -> Vec<AstNode> {
    if language == "rust" || language == "rs" {
        return collapse_rust_impl_nodes(children);
    }
    children
}

fn collapse_rust_impl_nodes(children: Vec<AstNode>) -> Vec<AstNode> {
    let mut nodes: Vec<AstNode> = Vec::new();
    let mut pending_impl_funcs: Vec<(String, Vec<AstNode>)> = Vec::new();
    let mut orphan_impl_funcs: Vec<AstNode> = Vec::new();

    for node in children {
        if node.node_type == "impl_item" {
            if let Some(owner_name) = node.name.clone() {
                pending_impl_funcs.push((owner_name, node.children));
            } else {
                orphan_impl_funcs.extend(node.children);
            }
            continue;
        }
        nodes.push(node);
    }

    for (owner_name, mut impl_funcs) in pending_impl_funcs {
        if let Some(owner) = nodes
            .iter_mut()
            .find(|n| n.name.as_deref() == Some(owner_name.as_str()))
        {
            owner.children.append(&mut impl_funcs);
        } else {
            orphan_impl_funcs.append(&mut impl_funcs);
        }
    }

    nodes.extend(orphan_impl_funcs);
    nodes
}

fn normalize_kind(node_type: &str) -> &'static str {
    match node_type {
        "class_definition"
        | "class_declaration"
        | "class_specifier"
        | "interface_declaration"
        | "record_declaration"
        | "struct_item"
        | "impl_item"
        | "trait_item"
        | "type_spec" => "Class",
        "function_definition"
        | "function_declaration"
        | "method_definition"
        | "function_item"
        | "method_declaration"
        | "constructor_declaration" => "Function",
        _ => "Syntax",
    }
}

fn normalize_node_type(raw_node_type: &str) -> &'static str {
    match normalize_kind(raw_node_type) {
        "Class" => "class",
        "Function" => "function",
        _ => "unknown",
    }
}

fn extract_name(node: Node, source: &str) -> Option<String> {
    if node.kind() == "impl_item" {
        return node
            .child_by_field_name("type")
            .and_then(|type_node| type_node.utf8_text(source.as_bytes()).ok())
            .map(|s| s.to_string());
    }

    node.child_by_field_name("name")
        .and_then(|name_node| name_node.utf8_text(source.as_bytes()).ok())
        .map(|s| s.to_string())
        .or_else(|| extract_name_fallback(node, source))
}

fn extract_name_fallback(node: Node, source: &str) -> Option<String> {
    // C/C++/Rust/Go and some JavaScript forms can nest names under declarators.
    for field in ["declarator", "declaration", "function", "type"] {
        if let Some(field_node) = node.child_by_field_name(field) {
            if let Some(name) = find_identifier_deep(field_node, source) {
                return Some(name);
            }
        }
    }
    find_identifier_deep(node, source)
}

fn find_identifier_deep(node: Node, source: &str) -> Option<String> {
    let kind = node.kind();
    if kind == "identifier" || kind == "field_identifier" || kind == "type_identifier" {
        return node
            .utf8_text(source.as_bytes())
            .ok()
            .map(|s| s.to_string());
    }

    let mut cursor = node.walk();
    for child in node.named_children(&mut cursor) {
        if let Some(found) = find_identifier_deep(child, source) {
            return Some(found);
        }
    }
    None
}

fn extract_docstring(node: Node, source: &str, language: &str) -> Option<String> {
    match language {
        "python" => extract_python_docstring(node, source),
        "rust" | "rs" if node.kind() == "struct_item" || node.kind() == "impl_item" => None,
        "javascript" | "js" | "typescript" | "ts" | "go" | "rust" | "java" | "cpp" | "c++" => {
            extract_js_leading_comment(node, source)
        }
        _ => None,
    }
}

fn extract_root_docstring(root: Node, source: &str, language: &str) -> Option<String> {
    match language {
        "python" => {
            let first_stmt = root.named_child(0)?;
            if first_stmt.kind() != "expression_statement" {
                return None;
            }
            let expr = first_stmt.named_child(0)?;
            let kind = expr.kind();
            if kind != "string" && kind != "concatenated_string" {
                return None;
            }
            let raw = expr.utf8_text(source.as_bytes()).ok()?;
            Some(clean_python_string_literal(raw))
        }
        "javascript" | "js" | "typescript" | "ts" | "go" | "rust" | "java" | "cpp" | "c++" => {
            extract_js_file_header_comment(source)
        }
        _ => None,
    }
}

fn extract_python_docstring(node: Node, source: &str) -> Option<String> {
    let body = node.child_by_field_name("body")?;
    if body.kind() != "block" {
        return None;
    }

    let first_stmt = body.named_child(0)?;
    if first_stmt.kind() != "expression_statement" {
        return None;
    }

    let expr = first_stmt.named_child(0)?;
    let kind = expr.kind();
    if kind != "string" && kind != "concatenated_string" {
        return None;
    }

    let raw = expr.utf8_text(source.as_bytes()).ok()?;
    Some(clean_python_string_literal(raw))
}

fn extract_js_file_header_comment(source: &str) -> Option<String> {
    let lines: Vec<&str> = source.lines().collect();
    if lines.is_empty() {
        return None;
    }

    let mut idx = 0usize;
    while idx < lines.len() && lines[idx].trim().is_empty() {
        idx += 1;
    }
    if idx >= lines.len() {
        return None;
    }

    let first = lines[idx].trim();
    if first.starts_with("//") {
        let mut comment_lines = Vec::new();
        while idx < lines.len() {
            let current = lines[idx].trim();
            if !current.starts_with("//") {
                break;
            }
            comment_lines.push(current.trim_start_matches("//").trim().to_string());
            idx += 1;
        }
        let joined = comment_lines.join("\n").trim().to_string();
        return if joined.is_empty() { None } else { Some(joined) };
    }

    if first.starts_with("/*") {
        let mut block = Vec::new();
        while idx < lines.len() {
            let current = lines[idx].trim();
            block.push(current);
            if current.ends_with("*/") {
                break;
            }
            idx += 1;
        }
        let cleaned = block
            .join("\n")
            .replace("/**", "")
            .replace("/*", "")
            .replace("*/", "")
            .lines()
            .map(|l| l.trim().trim_start_matches('*').trim())
            .collect::<Vec<&str>>()
            .join("\n")
            .trim()
            .to_string();
        return if cleaned.is_empty() {
            None
        } else {
            Some(cleaned)
        };
    }

    None
}

fn clean_python_string_literal(raw: &str) -> String {
    let trimmed = raw.trim();
    for quote in ["\"\"\"", "'''", "\"", "'"] {
        if trimmed.starts_with(quote) && trimmed.ends_with(quote) && trimmed.len() >= quote.len() * 2 {
            return trimmed[quote.len()..trimmed.len() - quote.len()].to_string();
        }
    }
    trimmed.to_string()
}

fn extract_js_leading_comment(node: Node, source: &str) -> Option<String> {
    let start_row = node.start_position().row;
    if start_row == 0 {
        return None;
    }

    let lines: Vec<&str> = source.lines().collect();
    if lines.is_empty() {
        return None;
    }

    let mut row: isize = start_row as isize - 1;
    while row >= 0 && lines[row as usize].trim().is_empty() {
        row -= 1;
    }
    if row < 0 {
        return None;
    }

    let line = lines[row as usize].trim();
    if line.starts_with("//") {
        return Some(line.trim_start_matches("//").trim().to_string());
    }
    if line.ends_with("*/") {
        let mut block = Vec::new();
        let mut cursor = row;
        while cursor >= 0 {
            let current = lines[cursor as usize].trim();
            block.push(current);
            if current.starts_with("/**") || current.starts_with("/*") {
                break;
            }
            cursor -= 1;
        }
        block.reverse();
        let joined = block.join("\n");
        return Some(
            joined
                .replace("/**", "")
                .replace("/*", "")
                .replace("*/", "")
                .lines()
                .map(|l| l.trim().trim_start_matches('*').trim())
                .collect::<Vec<&str>>()
                .join("\n")
                .trim()
                .to_string(),
        );
    }

    None
}
