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

// USE THIS INTERNAL FUNCTION TO ADD BASE PATH -> NO, only basePath variable
// import { addBasePath } from "next/dist/client/add-base-path";
// const basePath = (process.env.__NEXT_ROUTER_BASEPATH as string) || "";

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const IGNORED_FILES = ["404", "500", "_app", "_document", "_error"];

const last = <T>(array: T[]): T | undefined => array[array.length - 1];

const isApiRoutePath = (routePath: string) =>
  routePath === "/api" || routePath.startsWith("/api/");

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

const main = async () => {
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
    compilerOptions: { target: ScriptTarget.Latest },
  });

  const sourceFiles = project.addSourceFilesAtPaths(files);
  // const isApiFile = relativePath.startsWith("api/");

  sourceFiles.forEach((sourceFile) => {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(pagesDir, filePath);
    const routePath = getRoutePath(path.parse(relativePath));

    let moduleNamespace = "";
    let getRouteAlias = "getRoute";

    const importDeclarations = sourceFile.getImportDeclarations();
    const variableDeclarations = sourceFile.getVariableDeclarations();

    const importDeclaration = importDeclarations.find(
      (declaration) =>
        declaration.getModuleSpecifier().getLiteralText() ===
        "next-type-routes",
    );

    if (importDeclaration != null) {
      const namespaceImport = importDeclaration.getNamespaceImport();

      if (namespaceImport != null) {
        moduleNamespace = namespaceImport.getText() + ".";
      } else {
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
      }
    }

    const routeVariable = variableDeclarations.find((declaration) => {
      const initializer = declaration.getInitializer();

      return (
        initializer != null &&
        initializer.isKind(SyntaxKind.CallExpression) &&
        initializer.getExpression().getText() ===
          moduleNamespace + getRouteAlias
      );
    });

    const routeVariableInitializer =
      moduleNamespace + getRouteAlias + `<"${routePath}">()`;

    if (routeVariable != null) {
      routeVariable.setInitializer(routeVariableInitializer);
    } else {
      const lastImport = last(importDeclarations);
      const index = lastImport != null ? lastImport.getChildIndex() + 1 : 0;

      sourceFile.insertVariableStatement(index, {
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          { name: "route", initializer: routeVariableInitializer },
        ],
      });
    }

    // We add the import at the end to avoid messing with indexes
    if (importDeclaration == null) {
      sourceFile.addImportDeclaration({
        namedImports: [getRouteAlias],
        moduleSpecifier: "next-type-routes",
      });
    }

    // return sourceFile.save();
  });

  await project.save();

  const routePaths = fileParsedPaths.map(getRoutePath);

  const routes = routePaths
    .filter((routePath) => !isApiRoutePath(routePath))
    .sort()
    .map((file) => `"${file}"`)
    .join(",\n    ");

  const apiRoutes = routePaths
    .filter(isApiRoutePath)
    .sort()
    .map((file) => `"${file}"`)
    .join(",\n    ");

  fs.writeFileSync(
    path.resolve(__dirname, "userTypes.d.ts"),
    `export declare type Routes = [
    ${routes}
];
export declare type ApiRoutes = [
    ${apiRoutes}
];
`,
    "utf8",
  );
};

const program = new Command();

program
  .command("run", { isDefault: true })
  .description("generate the user types file and edit project files")
  .action(main);

program.parse(process.argv);
