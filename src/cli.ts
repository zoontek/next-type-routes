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
const getRouterPath = ({ dir, name }: path.ParsedPath) =>
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

  await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const filePath = sourceFile.getFilePath();
      const relativePath = path.relative(pagesDir, filePath);
      const routerPath = getRouterPath(path.parse(relativePath));
      const isApiFile = relativePath.startsWith("api/");

      const variableDeclarations = sourceFile.getVariableDeclarations();
      const importDeclarations = sourceFile.getImportDeclarations();

      const routeVariable = variableDeclarations.find((declaration) => {
        const initializer = declaration.getInitializer();

        return (
          initializer != null &&
          initializer.isKind(SyntaxKind.CallExpression) &&
          initializer.getExpression().getText() === "getRoute"
        );
      });

      if (routeVariable != null) {
        routeVariable.setInitializer(`getRoute<"${routerPath}">()`);
      } else {
        const lastImportDeclaration =
          importDeclarations[importDeclarations.length - 1];

        sourceFile.insertVariableStatement(
          lastImportDeclaration != null
            ? lastImportDeclaration.getChildIndex() + 1
            : 0,
          {
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
              { name: "route", initializer: `getRoute<"${routerPath}">()` },
            ],
          },
        );
      }

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
          .find((namedImport) => namedImport.getName() === "getRoute");

        if (getRouteImport != null && getRouteImport.getAliasNode() != null) {
          // TODO: log unsupported alias import
          getRouteImport.removeAlias();
        }

        if (getRouteImport == null) {
          importDeclaration.addNamedImports(["getRoute"]);
        }
      } else {
        sourceFile.addImportDeclaration({
          namedImports: ["getRoute"],
          moduleSpecifier: "next-type-routes",
        });
      }

      return sourceFile.save();
    }),
  );

  await project.save();

  // const pageFilesAst = pageFiles.map((file) => {
  //   const fileContent = fs.readFileSync(
  //     path.join(pagesDir, file.dir, file.base),
  //     "utf-8",
  //   );

  //   const { statements } = ast;
  //   const importDeclarations = statements.filter(ts.isImportDeclaration);
  //   const variableDeclarations = statements.filter(ts.isVariableStatement);

  //   const importDeclaration = importDeclarations.find(
  //     ({ moduleSpecifier }) =>
  //       ts.isStringLiteral(moduleSpecifier) &&
  //       moduleSpecifier.text === "next-type-routes",
  //   );

  //   if (!importDeclaration) {
  //     const getRouteIdentifier = ts.factory.createIdentifier("getRoute");
  //     const libNameIdentifier =
  //       ts.factory.createStringLiteral("next-type-routes");

  //     const importSpecifier = ts.factory.createImportSpecifier(
  //       false,
  //       getRouteIdentifier,
  //       getRouteIdentifier,
  //     );

  //     const namedImports = ts.factory.createNamedImports([importSpecifier]);

  //     const importClause = ts.factory.createImportClause(
  //       false,
  //       undefined,
  //       namedImports,
  //     );

  //     const x = ts.factory.createImportDeclaration(
  //       undefined,
  //       importClause,
  //       libNameIdentifier,
  //     );
  //   }

  //   const namedBindings = importDeclaration?.importClause?.namedBindings;
  //   const hasNamedBindings = namedBindings != null;

  //   if (hasNamedBindings && ts.isNamespaceImport(namedBindings)) {
  //     console.log(pc.red("next-type-routes namespace import is not supported"));
  //     process.exit(1);
  //   }

  //   if (!hasNamedBindings) {
  //     // const x = ts.factory.create;
  //   }

  //   const hasGetRouteImport =
  //     hasNamedBindings &&
  //     ts.isNamedImports(namedBindings) &&
  //     namedBindings.elements.find((element) => element);

  //   hasGetRouteImport;

  //   variableDeclarations
  //     .map(({ declarationList }) => declarationList.declarations)
  //     .flat()
  //     .filter(
  //       ({ initializer }) =>
  //         initializer != null && ts.isCallExpression(initializer),
  //     );

  //   // const {} = getRoute<"/">()

  //   // export const getServerSideProps = async () => {}
  //   // export async function getServerSideProps() {}

  //   // const cake = variableDeclarations.filter((dec) => dec.initializer != null && dec.initializer.);

  //   // .map((dec) => ({
  //   //   // text: dec.moduleSpecifier.getText(),
  //   //   fullText: dec.moduleSpecifier,
  //   // }));

  //   // const hasLibraryImport = importDeclarations.find(
  //   //   (importDeclaration) =>
  //   //     importDeclaration.moduleSpecifier.getText() === "next",
  //   // );

  //   // fs.writeFileSync(
  //   //   path.join(rootDir, file.name + ".json"),
  //   //   JSON.stringify(importDeclaration, null, 2),
  //   //   "utf-8",
  //   // );

  //   return ast;
  // });

  // pageFilesAst;

  const routes = fileParsedPaths
    .map(getRouterPath)
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
