import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Principio VIII: ningún texto visible escrito en el código. Recorre los .tsx de componentes y
 * páginas y falla si encuentra texto JSX literal o atributos visibles con texto literal.
 */
const ROOTS = ["src/components", "src/app"];
const VISIBLE_ATTRIBUTES = new Set(["alt", "title", "placeholder", "aria-label", "aria-description", "label"]);

function tsxFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

export function findLiterals(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && node.getText().trim() !== "") {
      found.push(node.getText().trim());
    }
    if (
      ts.isJsxAttribute(node) &&
      VISIBLE_ATTRIBUTES.has(node.name.getText()) &&
      node.initializer !== undefined &&
      ts.isStringLiteral(node.initializer) &&
      node.initializer.text.trim() !== ""
    ) {
      found.push(`${node.name.getText()}="${node.initializer.text}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe("sin texto visible en el código", () => {
  it("detecta texto JSX y atributos visibles literales", () => {
    expect(findLiterals("x.tsx", "const a = <p>Hola</p>;")).toEqual(["Hola"]);
    expect(findLiterals("x.tsx", 'const a = <img alt="Foto" />;')).toEqual(['alt="Foto"']);
    expect(findLiterals("x.tsx", 'const a = <p className="x">{t("k")}</p>;')).toEqual([]);
  });

  it("los componentes y páginas solo usan el catálogo", () => {
    const offenders = ROOTS.flatMap(tsxFiles).flatMap((path) =>
      findLiterals(path, readFileSync(path, "utf8")).map((text) => `${relative(".", path)}: ${text}`),
    );
    expect(offenders).toEqual([]);
  });
});
