export const DEMO_BY_LANGUAGE: Record<string, string> = {
  python: `"""Python demo: base class, subclass, and module functions."""

import os
from pathlib import Path

from .local_utils import helper


class ReportBuilder:
    """Base report shell."""

    def __init__(self, title: str) -> None:
        """Initialize base report title."""
        self.title = title

    def build(self) -> dict:
        """Build a minimal report payload."""
        return {"title": self.title}


class GiftReportBuilder(ReportBuilder):
    """Subclass adds gift metadata."""

    def __init__(self, title: str, code: str) -> None:
        """Store gift code and inherited title."""
        super().__init__(title)
        self.code = code

    def build(self) -> dict:
        """Build extended gift report payload."""
        out = super().build()
        out["code"] = self.code
        out["hint"] = helper(self.code)
        return out


def run_demo() -> dict:
    """Run the demo scenario."""
    g = GiftReportBuilder("Q4", "GIFT-1")
    return g.build()
`,
  javascript: `// JavaScript demo: extends + methods + top-level function.

import axios from "axios";
import z from "./local.js";

class ReportBase {
  // Base title for all reports.
  title() {
    return "base";
  }
}

class UserService extends ReportBase {
  // Create a user record using base label.
  createUser(name) {
    return { name, label: this.title() };
  }
}

// Build report at module level.
function buildReport(id) {
  return { id, ok: true };
}
`,
  typescript: `// TypeScript demo: abstract-ish base, subclass, types.

import { join } from "node:path";
import React from "react";
import { helper } from "./local";

type Report = { title: string };

class BaseController {
  // Shared transform behavior.
  protected transform(input: string): string {
    return input;
  }
}

class AppController extends BaseController {
  // Entry point for app-side processing.
  run(path: string): string {
    return helper(join(path, "ok"));
  }
}

// Summarize report metadata.
function summarize(x: Report): string {
  return x.title;
}
`,
  go: `// Go demo: embedded struct + methods on outer type.

package main

import (
	"fmt"

	"github.com/google/uuid"
)

type ReportBase struct {
	// Title keeps the base report label.
	Title string
}

func (b ReportBase) Label() string {
	// Return base label.
	return b.Title
}

// User service reuses base behavior.
type UserService struct {
	ReportBase
}

func (s UserService) CreateUser(name string) string {
	// Build user payload value.
	return name
}

func runDemo() {
	// Execute demo side effect.
	_ = fmt.Sprint(uuid.New())
}
`,
  rust: `// Rust demo: composed "base" struct + service with methods.

use serde::Serialize;
use std::fmt::Debug;

use crate::local::helper;

struct ReportBase {
    // Base title for report-like objects.
    title: String,
}

impl ReportBase {
    // Construct base report.
    fn new(title: &str) -> Self {
        Self {
            title: title.to_string(),
        }
    }
}

// Service wraps base report.
struct UserService {
    base: ReportBase,
}

impl UserService {
    // Create user display value.
    fn create_user(&self, name: &str) -> String {
        helper(name)
    }
}
`,
  java: `// Java demo: inheritance + overrides.

import java.util.List;

import org.slf4j.Logger;

import com.example.local.Helper;

class ReportBase {
    // Return base title.
    String title() {
        return "base";
    }
}

class UserService extends ReportBase {
    // Create user from input name.
    String createUser(String name) {
        return name;
    }
}
`,
  cpp: `// C++ demo: public inheritance + virtual-style base.

#include <fmt/core.h>
#include <vector>

#include "local/helper.hpp"


class ReportBase {
public:
    // Return base title literal.
    virtual const char* title() {
        return "base";
    }
};


// User-facing service inherits report base.
class UserService : public ReportBase {
public:
    // Create user value from input.
    const char* createUser(const char* name) {
        return name;
    }
};
`,
  c: `// C demo: struct + module functions (no "class" — stays detected as C).

#include <stdio.h>

#include "local.h"

struct Point {
    // Keep X coordinate.
    int x;
    // Keep Y coordinate.
    int y;
};

// Add two integers.
int add(int a, int b) {
    return a + b;
}

// Combine point coordinates.
int combine(struct Point p) {
    return p.x + p.y;
}
`,
  csharp: `// C# demo: base class + derived service.

using System;

using MyCompany.App;

class ReportBase {
    // Base virtual title.
    public virtual string Title() => "base";
}

class UserService : ReportBase {
    // Create user value from input.
    public string CreateUser(string name) => name;
}
`,
  php: `<?php
// PHP demo: base class + service + module function.

use App\\Local\\Helper;
use DateTime;

class ReportBase {
    // Return base title.
    public function title(): string {
        return "base";
    }
}

class UserService extends ReportBase {
    // Create user from input.
    public function createUser(string $name): string {
        return $name;
    }
}

// Build report at module scope.
function build_report(): array {
    return [];
}
`,
  kotlin: `// Kotlin demo: open base + derived service.

import java.time.Instant

import com.example.local.Helper

open class ReportBase {
    // Return base title.
    open fun title(): String = "base"
}

class UserService : ReportBase() {
    // Create user from input.
    fun createUser(name: String): String {
        return name
    }
}

// Execute demo routine.
fun runDemo(): String = "ok"
`,
  swift: `// Swift demo: inheritance + global function.

import Foundation
import MyLocalModule

class ReportBase {
    // Return base report title.
    func title() -> String {
        "base"
    }
}

class UserService: ReportBase {
    // Create user from input.
    func createUser(_ name: String) -> String {
        name
    }
}

// Build report payload.
func buildReport() -> [String: Any] {
    [:]
}
`,
  dart: `// Dart demo: extends + top-level function.

import 'dart:io';

import 'package:http/http.dart';

import './local.dart';

// Base class for report output.
class ReportBase {
  // Return base report title.
  String title() => "base";
}

// Service class extends report base.
class UserService extends ReportBase {
  // Create user from input.
  String createUser(String name) => name;
}

// Describe demo state.
String describeDemo() => "ok";
`,
  ruby: `# Ruby demo: inheritance + module function.

require "json"
require_relative "./local_helper"

class ReportBase
  # Return base title.
  def title
    "base"
  end
end

class UserService < ReportBase
  # Create user from input.
  def create_user(name)
    name
  end
end

# Build report hash payload.
def build_report(id)
  { id: id }
end
`,
  r: `# R demo: factories + closures.

library(stats)
library(ggplot2)

source("local.R")

make_base <- function() {
  # Build base list object.
  list(kind = "base")
}

 # Build service object with closure methods.
make_service <- function() {
  s <- make_base()
  # Attach user-creation closure.
  s$create_user <- function(name) {
    name
  }
  s
}

# Build report from numeric input.
build_report <- function(x) {
  x + 1
}
`,
};

export const TOP_10_LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "java",
  "csharp",
  "cpp",
  "go",
  "rust",
  "php",
  "swift",
] as const;

export const PARSE_SUPPORTED_LANGUAGES = new Set([
  "python",
  "javascript",
  "typescript",
  "go",
  "rust",
  "java",
  "cpp",
  "c",
  "csharp",
  "php",
  "kotlin",
  "swift",
  "dart",
  "ruby",
  "r",
]);

export function detectLanguage(source: string): string {
  const s = source.trim();
  if (!s) return "python";
  if (/^<\?php/m.test(s) || /\bfunction\s+\w+\s*\(\$/.test(s) || /\buse\s+[A-Z][\w\\]+;/m.test(s)) return "php";
  if (/^\s*using\s+[A-Z][\w.]*\s*;/m.test(s) || /\bnamespace\s+[A-Z][\w.]+/m.test(s)) return "csharp";
  if (/^\s*library\([^)]+\)/m.test(s) || /^\s*source\([^)]+\)/m.test(s) || /<-\s*function\s*\(/m.test(s)) return "r";
  if (/^\s*import\s+['"]dart:/m.test(s) || /^\s*import\s+['"]package:/.test(s)) return "dart";
  if (/^\s*import\s+Foundation/m.test(s) || /\bfunc\s+\w+\s*\([^)]*\)\s*->/m.test(s)) return "swift";
  if (/^\s*import\s+java\./m.test(s) && /\bfun\s+\w+\s*\(/m.test(s)) return "kotlin";
  if (/^\s*#include\s+[<"]/m.test(s) && !/\bclass\s+\w+/.test(s)) return "c";
  if (/^\s*#include\s+[<"]/m.test(s)) return "cpp";
  if (
    /^\s*package\s+[\w.]+\s*;/m.test(s) ||
    /^\s*import\s+java\./m.test(s) ||
    /^\s*import\s+javax\./m.test(s) ||
    /\bpublic\s+class\s+\w+/m.test(s) ||
    // Java: modifier + return type + name + `(`. TS uses `protected abstract name(` — skip when `abstract` follows the modifier.
    /\bclass\s+\w+\s*\{[\s\S]*\b(?:public|private|protected)\s+(?!abstract\b)\w+\s+\w+\s*\(/m.test(s)
  ) {
    return "java";
  }
  if (/^\s*use\s+[\w:]+::/m.test(s) || /\bimpl\s+\w+\s*\{/m.test(s) || /\bfn\s+\w+\s*\(/m.test(s)) return "rust";
  if (
    /^\s*package\s+\w+/m.test(s) &&
    (/\bfunc\s+\w+\s*\(/m.test(s) || /\bfunc\s*\([^)]*\)\s*\w+\s*\(/m.test(s) || /^\s*import\s+"[^"]+"/m.test(s))
  ) {
    return "go";
  }
  if (
    /^\s*from\s+[\w.]+\s+import\s+/m.test(s) ||
    /^\s*def\s+\w+\s*\([^)]*\)\s*(->\s*[^:]+)?\s*:/m.test(s) ||
    /^\s*class\s+\w+\s*:/m.test(s)
  ) {
    return "python";
  }
  if (
    /^\s*require_relative\s+["']/m.test(s) ||
    /^\s*require\s+["']/m.test(s) ||
    /^\s*def\s+\w+(?:\s*\([^)]*\))?\s*$/m.test(s)
  ) {
    return "ruby";
  }
  if (
    /\binterface\s+\w+/m.test(s) ||
    /\btype\s+\w+\s*=/m.test(s) ||
    /:\s*[A-Za-z_]\w*(\[\])?(\s*[|&]\s*[A-Za-z_]\w*(\[\])?)*\s*[=;,{)]/.test(s)
  ) {
    return "typescript";
  }
  return "javascript";
}
