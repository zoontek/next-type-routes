#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import pc from "picocolors";
import pkgDir from "pkg-dir";

const exists = async (dir: string) => {
  try {
    await fs.access(dir);
    return dir;
  } catch {
    return;
  }
};

const getFiles = async (dir: string): Promise<string[]> => {
  const dirents = await fs.readdir(dir, {
    withFileTypes: true,
  });

  const files = await Promise.all(
    dirents.map((dirent) => {
      const item = path.resolve(dir, dirent.name);

      return dirent.isFile()
        ? item
        : dirent.isDirectory()
        ? getFiles(item)
        : [];
    }),
  );

  return files.flat();
};

const generateFile = async (filePath: string) => {
  const rootDir = (await pkgDir().catch(() => {})) ?? process.cwd();

  const pagesDir = (
    await Promise.all(
      // https://github.com/blitz-js/blitz/blob/canary/nextjs/packages/next/build/utils.ts#L54-L59
      ["pages", "src/pages", "app/pages", "integrations/pages"]
        .map((dir) => path.join(rootDir, dir))
        .map((dir) => exists(dir)),
    )
  ).find((dir): dir is string => {
    return typeof dir === "string";
  });

  if (pagesDir == null) {
    console.log(pc.red("No pages directory detected! Skip router generation…"));
    process.exit(1);
  }

  const routes = (await getFiles(pagesDir))
    .map((file) => path.parse(path.relative(pagesDir, file)))
    .filter(
      (file) =>
        [".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(file.ext) &&
        !["404", "500", "_app", "_document", "_error"].includes(file.name),
    )
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

  await fs.writeFile(
    path.resolve(rootDir, filePath),
    `import { createTypedFns } from "next-type-router";

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
  .description("generate the router file")
  .action((arg: string) => generateFile(arg));

program.parse(process.argv);
