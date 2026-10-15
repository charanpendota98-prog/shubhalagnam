import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.join(frontendRoot, "src");
const appRoot = path.join(sourceRoot, "app");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const PAGE_FILES = new Set(["page.ts", "page.tsx", "page.js", "page.jsx"]);

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

function routeFromPage(pagePath) {
  const directory = path.relative(appRoot, path.dirname(pagePath));
  const segments = directory === "" ? [] : directory.split(path.sep);
  const visibleSegments = segments.filter((segment) =>
    !segment.startsWith("(") && !segment.startsWith("@"),
  );
  return visibleSegments.length ? `/${visibleSegments.join("/")}` : "/";
}

function routePattern(route) {
  if (route === "/") return /^\/$/;
  const parts = route.split("/").filter(Boolean);
  const expression = parts.map((part) => {
    if (/^\[\[\.\.\..+\]\]$/.test(part)) return "(?:/.*)?";
    if (/^\[\.\.\..+\]$/.test(part)) return "/.+";
    if (/^\[.+\]$/.test(part)) return "/[^/]+";
    return `/${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
  }).join("");
  return new RegExp(`^${expression}/?$`);
}

function getAttribute(element, name, sourceFile) {
  return element.attributes.properties.find((attribute) =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === name,
  );
}

function literalAttributeValue(attribute) {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression
      && ts.isStringLiteral(attribute.initializer.expression)) {
    return attribute.initializer.expression.text;
  }
  return null;
}

function staticHrefValues(attribute) {
  if (!attribute?.initializer) return [];
  const values = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      values.push(node.text);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(attribute.initializer);
  return values;
}

function localPagePath(href) {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const pathname = href.split(/[?#]/, 1)[0] || "/";
  if (pathname === "/api" || pathname.startsWith("/api/")) return null;
  // Public files, Next internals, and API destinations are outside the app-page map.
  if (pathname.startsWith("/_next/") || /\.[a-zA-Z0-9]{1,12}$/.test(pathname)) return null;
  return pathname.replace(/\/{2,}/g, "/");
}

const pages = listFiles(appRoot).filter((file) => PAGE_FILES.has(path.basename(file)));
const routes = [...new Set(pages.map(routeFromPage))];
const routeMatchers = routes.map((route) => ({ route, pattern: routePattern(route) }));
const routeErrors = [];
const blankTargetErrors = [];
let staticLocalLinks = 0;
let blankTargetLinks = 0;

for (const file of listFiles(sourceRoot).filter((item) => SOURCE_EXTENSIONS.has(path.extname(item)))) {
  const source = fs.readFileSync(file, "utf8");
  const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX
    : file.endsWith(".jsx") ? ts.ScriptKind.JSX
      : file.endsWith(".js") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const hrefAttribute = getAttribute(node, "href", sourceFile);
      for (const href of staticHrefValues(hrefAttribute)) {
        const pathname = localPagePath(href);
        if (pathname === null) continue;
        staticLocalLinks += 1;
        if (!routeMatchers.some(({ pattern }) => pattern.test(pathname))) {
          const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          routeErrors.push(`${path.relative(frontendRoot, file)}:${location.line + 1}: ${JSON.stringify(href)} does not match an app page route`);
        }
      }

      const target = literalAttributeValue(getAttribute(node, "target", sourceFile));
      if (target?.toLowerCase() === "_blank") {
        blankTargetLinks += 1;
        const rel = literalAttributeValue(getAttribute(node, "rel", sourceFile)) || "";
        if (!/(?:^|\s)(?:noopener|noreferrer)(?:\s|$)/i.test(rel)) {
          const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          blankTargetErrors.push(`${path.relative(frontendRoot, file)}:${location.line + 1}: target="_blank" must include rel="noopener" or rel="noreferrer"`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

if (routeErrors.length || blankTargetErrors.length) {
  for (const error of [...routeErrors, ...blankTargetErrors]) console.error(`✗ ${error}`);
  console.error(`\nLink audit failed: ${routeErrors.length} unresolved static route(s), ${blankTargetErrors.length} unsafe new-tab link(s).`);
  process.exitCode = 1;
} else {
  console.log(`Link audit passed: ${routes.length} app routes, ${staticLocalLinks} static internal links, ${blankTargetLinks} new-tab links.`);
  console.log("Static internal paths resolve to app pages; new-tab links declare opener protection.");
}
