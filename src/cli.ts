#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import pkgDir from "pkg-dir";
import ts from "typescript";

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

const isApiRouteFile = (parsedPath: path.ParsedPath) =>
  parsedPath.dir === "api" || parsedPath.dir.startsWith("api/");

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

  const files = getRouteFiles(pagesDir);
  const apiFiles = files.filter((file) => isApiRouteFile(file));
  // const pageFiles = files.filter((file) => !isApiRouteFile(file));

  console.log(apiFiles);

  const apiFilesAst = apiFiles.map((file) => {
    const ast = ts.createSourceFile(
      "x.ts",
      fs.readFileSync(path.join(pagesDir, file.dir, file.base), "utf-8"),
      ts.ScriptTarget.Latest,
    );

    const { statements } = ast;

    const importDeclaration = statements
      .filter(ts.isImportDeclaration)
      .find(
        ({ moduleSpecifier }) =>
          ts.isStringLiteral(moduleSpecifier) &&
          moduleSpecifier.text === "next",
      );

    console.log(importDeclaration);

    // .map((dec) => ({
    //   // text: dec.moduleSpecifier.getText(),
    //   fullText: dec.moduleSpecifier,
    // }));

    // const hasLibraryImport = importDeclarations.find(
    //   (importDeclaration) =>
    //     importDeclaration.moduleSpecifier.getText() === "next",
    // );

    fs.writeFileSync(
      path.join(rootDir, file.name + ".json"),
      JSON.stringify(importDeclaration, null, 2),
      "utf-8",
    );

    return ast;
  });

  apiFilesAst;

  const routes = files
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
