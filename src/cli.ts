#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import pkgDir from "pkg-dir";
import {
  Project,
  ScriptTarget,
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const IGNORED_FILES = ["404", "500", "_app", "_document", "_error"];

// TODO: use that for [...slug]
export type NonEmptyArray<T> = [T, ...T[]];

const last = <T>(array: T[]): T | undefined => array[array.length - 1];

const getFilesRecursive = (dir: string): string[] => {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });

  return dirents
    .map((dirent) => {
      const item = path.resolve(dir, dirent.name);

      return dirent.isFile()
        ? item
        : dirent.isDirectory()
        ? getFilesRecursive(item)
        : [];
    })
    .flat();
};

const getRouteFiles = (pagesDir: string) =>
  getFilesRecursive(pagesDir)
    .map((file) => path.parse(path.relative(pagesDir, file)))
    .filter(
      (file) =>
        SUPPORTED_EXTENSIONS.includes(file.ext) &&
        !IGNORED_FILES.includes(file.name),
    );

// Get router path from relative path
const getRoutePath = ({ dir, name }: path.ParsedPath) =>
  `/${dir}${name === "index" ? "" : `/${name}`}`;

const generateFile = async (filePath: string) => {
  const rootDir = pkgDir.sync() ?? process.cwd();

  // https://github.com/blitz-js/blitz/blob/canary/nextjs/packages/next/build/utils.ts#L54-L59
  const pagesDir = ["pages", "src/pages", "app/pages", "integrations/pages"]
    .map((dir) => path.join(rootDir, dir))
    .find(fs.existsSync);

  if (pagesDir == null) {
    console.log(pc.red("No pages directory detected! Skip routes generation…"));
    process.exit(1);
  }

  const fileParsedPaths = getRouteFiles(pagesDir);

  const files = fileParsedPaths.map((file) =>
    path.join(pagesDir, file.dir, file.base),
  );

  const project = new Project({
    compilerOptions: {
      target: ScriptTarget.Latest,
      // tsConfigFilePath: "path/to/tsconfig.json",
    },
  });

  const sourceFiles = project.addSourceFilesAtPaths(files);

  sourceFiles.forEach((sourceFile) => {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(pagesDir, filePath);
    const routePath = getRoutePath(path.parse(relativePath));

    // const isApiFile = relativePath.startsWith("api/");

    let getRouteAlias = "getRoute";

    const variableDeclarations = sourceFile.getVariableDeclarations();
    const importDeclarations = sourceFile.getImportDeclarations();

    const importDeclaration = importDeclarations.find(
      (declaration) =>
        declaration.getModuleSpecifier().getLiteralText() ===
        "next-type-routes",
    );

    if (importDeclaration != null) {
      const namespaceImport = importDeclaration.getNamespaceImport();

      if (namespaceImport != null) {
        // TODO: log unsupported namespace imports
        importDeclaration.removeNamespaceImport();
      }

      const getRouteImport = importDeclaration
        .getNamedImports()
        .find((namedImport) => namedImport.getName() === getRouteAlias);

      if (getRouteImport != null) {
        const alias = getRouteImport.getAliasNode();

        if (alias != null) {
          getRouteAlias = alias.getText();
        }
      } else {
        importDeclaration.addNamedImports([getRouteAlias]);
      }
    } else {
      sourceFile.addImportDeclaration({
        moduleSpecifier: "next-type-routes",
        namedImports: [getRouteAlias],
      });
    }

    const routeVariable = variableDeclarations.find((declaration) => {
      const initializer = declaration.getInitializer();

      return (
        initializer != null &&
        initializer.isKind(SyntaxKind.CallExpression) &&
        initializer.getExpression().getText() === getRouteAlias
      );
    });

    if (routeVariable != null) {
      routeVariable.setInitializer(`${getRouteAlias}<"${routePath}">()`);
    } else {
      const lastImportIndex = last(importDeclarations)?.getChildIndex();

      const index =
        (lastImportIndex != null ? lastImportIndex + 1 : 0) +
        (importDeclaration == null ? 1 : 0);

      sourceFile.insertVariableStatement(index, {
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          { name: "route", initializer: `${getRouteAlias}<"${routePath}">()` },
        ],
      });
    }

    // return sourceFile.save();
  });

  await project.save();

  const routes = fileParsedPaths
    .map(getRoutePath)
    .sort()
    .map((file) => `"${file}"`)
    .join(",\n  ");

  await fs.writeFileSync(
    path.resolve(rootDir, filePath),
    `import { createTypedFns } from "next-type-routes";

export const {
  createURL,
  getApiRequestParams,
  getServerSideParams,
  useRouterWithSSR,
  useRouterWithNoSSR,
} = createTypedFns([
  ${routes},
]);
`,
    "utf8",
  );
};

const program = new Command();

program
  .command("generate", { isDefault: true })
  .argument("<filePath>", "file path")
  .description("generate the routes file")
  .action((arg: string) => generateFile(arg));

program.parse(process.argv);
