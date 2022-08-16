#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import pc from "picocolors";
import pkgDir from "pkg-dir";

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
        [".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(file.ext) &&
        !["404", "500", "_app", "_document", "_error"].includes(file.name),
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
  const pageFiles = files.filter((file) => !isApiRouteFile(file));

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
