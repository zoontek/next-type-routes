#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import pkgDir from "pkg-dir";
import { Project, ScriptTarget } from "ts-morph";

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const IGNORED_FILES = ["404", "500", "_app", "_document", "_error"];

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

  // TODO: use reduce?
  // const files = getRouteFiles(pagesDir).map((file) => {
  //   const relativePath = path.join(file.dir, file.base);

  //   return {
  //     ...file,
  //     absolutePath: path.join(pagesDir, relativePath),
  //     relativePath,
  //     isApiFile: relativePath.startsWith("api/"),
  //   };
  // });

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
      const isApiFile = relativePath.startsWith("api/");

      const importDeclaration = sourceFile.getImportDeclaration(
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

        const namedImports = importDeclaration.getNamedImports();
        const importNames = namedImports.map((item) => item.getName());

        const hasGetRouteImport =
          importNames.find((item) => item === "getRoute") != null;

        if (!hasGetRouteImport) {
          importDeclaration.addNamedImports(["getRoute"]);
        }
      } else {
        sourceFile.addImportDeclaration({
          moduleSpecifier: "next-type-router",
          namedImports: ["getRoute"],
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
    .map((file) => {
      if (file.dir === "" && file.name === "index") {
        return "/";
      }
      return (
        (file.dir !== "" ? "/" + file.dir : "") +
        (file.name !== "index" ? "/" + file.name : "")
      );
    })
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
