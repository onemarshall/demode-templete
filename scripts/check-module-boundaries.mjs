#!/usr/bin/env node
/** Enforce ownership and browser/server boundaries without executing application modules. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const lib = path.join(root, 'src/lib');
const sourceExtensions = ['.ts', '.js', '.svelte'];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['__tests__', '__fixtures__'].includes(entry.name)) walk(file);
    } else if (sourceExtensions.includes(path.extname(file)) && !/\.(test|spec)\./.test(file)) {
      files.push(file);
    }
  }
}
walk(lib);
const fileSet = new Set(files);
const relative = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const owner = (file) => {
  const parts = path.relative(lib, file).split(path.sep);
  return parts[0] === 'modules' ? parts.slice(0, 2).join('/') : parts[0];
};
function resolveImport(from, specifier) {
  let target;
  if (specifier.startsWith('#lib/')) target = path.join(lib, specifier.slice(5));
  else if (specifier.startsWith('$lib/')) target = path.join(lib, specifier.slice(5));
  else if (specifier.startsWith('.')) target = path.resolve(path.dirname(from), specifier);
  else return null;
  const candidates = [target, target.replace(/\.js$/, '.ts')];
  for (const ext of sourceExtensions) candidates.push(`${target}${ext}`, path.join(target, `index${ext}`));
  return candidates.find((candidate) => fileSet.has(candidate) || (fs.existsSync(candidate) && fs.statSync(candidate).isFile())) ?? null;
}
function imports(file) {
  const contents = fs.readFileSync(file, 'utf8');
  const source = file.endsWith('.svelte')
    ? [...contents.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]).join('\n')
    : contents;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result = [];
  function add(node, specifier, typeOnly = false) {
    result.push({ specifier, typeOnly, target: resolveImport(file, specifier), line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 });
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const typeOnly = clause?.isTypeOnly || (!clause?.name && bindings && ts.isNamedImports(bindings) && bindings.elements.length > 0 && bindings.elements.every((item) => item.isTypeOnly));
      add(node, node.moduleSpecifier.text, Boolean(typeOnly));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = node.isTypeOnly || (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0 && node.exportClause.elements.every((item) => item.isTypeOnly));
      add(node, node.moduleSpecifier.text, Boolean(typeOnly));
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      add(node, node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return result;
}
const graph = new Map(files.map((file) => [file, imports(file)]));
const violations = new Set();
for (const [file, edges] of graph) {
  for (const edge of edges) {
    if (!edge.target) {
      if (edge.specifier.startsWith('#lib/') || edge.specifier.startsWith('$lib/') || edge.specifier.startsWith('.')) {
        violations.add(`${relative(file)}:${edge.line}: unresolved local import ${edge.specifier}`);
      }
      continue;
    }
    const from = owner(file);
    const to = owner(edge.target);
    if (from === 'modules/auth' && ['app', 'modules/billing', 'modules/tenancy', 'modules/monitoring'].includes(to)) {
      violations.add(`${relative(file)}:${edge.line}: auth must receive ${to} integration through its host contracts`);
    }
    if (from === 'platform' && (to === 'app' || to.startsWith('modules/'))) {
      violations.add(`${relative(file)}:${edge.line}: platform must not depend on ${to}`);
    }
    if (edge.specifier.startsWith('.') && from !== to) {
      violations.add(`${relative(file)}:${edge.line}: use #lib/ for imports across ownership boundaries (${to})`);
    }
  }
}
const isServer = (file) => /(?:^|\/)server(?:\/|$)|(?:^|\/|\.)server\.[^/]+$/.test(relative(file));
const isRemote = (file) => /\.remote\.[^/]+$/.test(file);
// Remote functions are a framework RPC boundary. Their server-side dependencies must
// not be traversed as if the remote implementation were shipped to the browser.
const browserRoots = files.filter((file) => !isServer(file) && !isRemote(file) && (
  file.endsWith('.svelte') || /\/(client|shared|components)\//.test(relative(file)) || /\/(auth-client|types)\.ts$/.test(file) || /\/modules\/auth\/index\.ts$/.test(relative(file)) || /\/platform\/(config|cms|storage)\/index\.ts$/.test(relative(file))
));
const checked = new Set();
function checkBrowser(file, chain) {
  if (checked.has(file)) return;
  checked.add(file);
  for (const edge of graph.get(file) ?? []) {
    if (edge.typeOnly) continue;
    const trail = [...chain, relative(file)];
    if (edge.specifier === '$app/server' || /\$env\/(static|dynamic)\/private/.test(edge.specifier) || (edge.target && isServer(edge.target))) {
      violations.add(`${relative(file)}:${edge.line}: browser dependency reaches server code: ${edge.specifier}\n  via ${trail.join(' -> ')}`);
    } else if (edge.target && !isRemote(edge.target)) {
      checkBrowser(edge.target, trail);
    }
  }
}
for (const file of browserRoots) checkBrowser(file, []);
if (violations.size) {
  console.error(`Module boundary check failed (${violations.size}):\n${[...violations].sort().join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Module boundaries verified across ${files.length} source files.`);
}
