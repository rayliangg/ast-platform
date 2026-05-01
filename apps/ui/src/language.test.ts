import { describe, expect, it } from "vitest";
import { detectLanguage } from "./language";

describe("detectLanguage", () => {
  const cases: Array<[string, string, string]> = [
    ["python", "def foo(x):\n    return x\n", "python function"],
    ["javascript", "import x from 'x';\nclass A { foo() { return 1; } }\n", "javascript class"],
    ["typescript", "type User = { id: string }\nclass A { foo(x: string): string { return x } }\n", "typescript type annotation"],
    ["java", "import java.util.List;\npublic class A { public String x(String n) { return n; } }\n", "java class"],
    ["csharp", "using System;\nnamespace Demo { class A { public string X(string n) { return n; } } }\n", "csharp namespace and using"],
    ["cpp", "#include <vector>\nclass A { public: int x() { return 1; } };\n", "cpp include and class"],
    ["c", "#include <stdio.h>\nint add(int a, int b) { return a + b; }\n", "c include and function"],
    ["go", "package main\nimport \"fmt\"\nfunc main() { fmt.Println(1) }\n", "go package func"],
    ["php", "<?php\nuse App\\Local\\Helper;\nclass A { public function x($n) { return $n; } }\n", "php class and use"],
    ["rust", "use std::fmt::Debug;\nstruct A;\nimpl A { fn x(&self) -> i32 { 1 } }\n", "rust use impl"],
    ["kotlin", "import java.time.Instant\nclass A { fun x(n: String): String { return n } }\n", "kotlin import fun"],
    ["swift", "import Foundation\nclass A { func x(_ n: String) -> String { return n } }\n", "swift import func"],
    ["dart", "import 'dart:io';\nclass A { String x(String n) => n; }\n", "dart import class"],
    ["ruby", "require \"json\"\nclass A\n  def x(n)\n    n\n  end\nend\n", "ruby require def"],
    ["r", "library(stats)\nsource(\"local.R\")\nb <- function(x) { x + 1 }\n", "r library function"],
  ];

  for (const [expected, source, title] of cases) {
    it(`detects ${expected} for ${title}`, () => {
      expect(detectLanguage(source)).toBe(expected);
    });
  }

  it("does not misclassify python type hints as typescript", () => {
    const source = "def foo(x: str) -> str:\n    return x\n";
    expect(detectLanguage(source)).toBe("python");
  });

  it("does not misclassify typescript abstract methods as java", () => {
    const source = `import path from "node:path";
import { helper } from "../shared/helper";

abstract class BaseController {
  protected abstract transform(input: string): string;

  run(input: string): string {
    return this.transform(input.trim());
  }
}
`;
    expect(detectLanguage(source)).toBe("typescript");
  });

  it("defaults to javascript for unknown syntax", () => {
    expect(detectLanguage("console.log('hello')")).toBe("javascript");
  });
});
