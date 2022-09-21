#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import prettier from "prettier";
import path from "path";
import pc from "picocolors";
import pkgDir from "pkg-dir";
import {
  Project,
  ScriptTarget,
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";
import { PARAM_TYPES } from "./constants";
import { extractRoute } from "./extractRoute";
import { RouteParamPart } from "./types";

// USE THIS INTERNAL FUNCTION TO ADD BASE PATH -> NO, only basePath variable
// import { addBasePath } from "next/dist/client/add-base-path";
// const basePath = (process.env.__NEXT_ROUTER_BASEPATH as string) || "";

const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const IGNORED_FILES = ["404", "500", "_app", "_document", "_error"];

const last = <T>(array: T[]): T | undefined => array[array.length - 1];

const isApiRoute = (route: string) =>
  route === "/api" || route.startsWith("/api/");

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
const getRouteFromPath = ({ dir, name }: path.ParsedPath) =>
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

  const filePaths = fileParsedPaths.map((file) =>
    path.join(pagesDir, file.dir, file.base),
  );

  const project = new Project({
    compilerOptions: { target: ScriptTarget.Latest },
  });

  // Don't use addSourceFilesAtPaths since it parses globs
  const sourceFiles = filePaths.map((filePath) =>
    project.addSourceFileAtPath(filePath),
  );

  sourceFiles.forEach((sourceFile) => {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(pagesDir, filePath);
    const route = getRouteFromPath(path.parse(relativePath));

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
      moduleNamespace + getRouteAlias + `<"${route}">()`;

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

  const routes = fileParsedPaths.map(getRouteFromPath).sort();
  const pageRoutes = routes.filter((route) => !isApiRoute(route));
  const apiRoutes = routes.filter(isApiRoute);

  let importNonEmptyArray = false;

  // TODO: Factorize these two
  const pageRoutesParams = pageRoutes.reduce<string[]>((acc, route) => {
    const routeParamParts = extractRoute(route)
      .routeParts.filter(
        (routePart): routePart is RouteParamPart =>
          typeof routePart !== "string",
      )
      .map((routePart) => {
        switch (routePart.type) {
          case PARAM_TYPES.OPTIONAL_CATCH_ALL:
            return `"${routePart.name}": string[]`;
          case PARAM_TYPES.CATCH_ALL: {
            importNonEmptyArray = true;
            return `"${routePart.name}": NonEmptyArray<string>`;
          }
          default:
            return `"${routePart.name}": string`;
        }
      });

    return [
      ...acc,
      `"${route}": ${
        routeParamParts.length === 0
          ? "undefined"
          : `{
  ${routeParamParts.join(",")} }`
      }`,
    ];
  }, []);

  // TODO: Correctly type useRouter, getServerSideParams etc
  // Don't expose getServerSideParams if getServerSideProps is not used
  const apiRouteParams = apiRoutes.reduce<string[]>((acc, route) => {
    const routeParamParts = extractRoute(route)
      .routeParts.filter(
        (routePart): routePart is RouteParamPart =>
          typeof routePart !== "string",
      )
      .map((routePart) => {
        switch (routePart.type) {
          case PARAM_TYPES.OPTIONAL_CATCH_ALL:
            return `"${routePart.name}": string[]`;
          case PARAM_TYPES.CATCH_ALL: {
            importNonEmptyArray = true;
            return `"${routePart.name}": NonEmptyArray<string>`;
          }
          default:
            return `"${routePart.name}": string`;
        }
      });

    return [
      ...acc,
      `"${route}": ${
        routeParamParts.length === 0
          ? "undefined"
          : `{
  ${routeParamParts.join(",")} }`
      }`,
    ];
  }, []);

  const start = importNonEmptyArray
    ? `import { NonEmptyArray } from "./types";
`
    : "";

  // export declare type Routes = [
  //   ${routes.map((file) => `"${file}"`).join(",")}
  // ];

  // export declare type ApiRoutes = [
  //   ${apiRoutes.map((file) => `"${file}"`).join(",")}
  // ];

  fs.writeFileSync(
    path.resolve(__dirname, "generated.d.ts"),
    prettier.format(
      `import { GetServerSidePropsContext, NextApiRequest } from "next";
${start}

export declare type ApiRoutesParams = {
  ${apiRouteParams.join(",")}
};

export declare type PageRoutesParams = {
  ${pageRoutesParams.join(",")}
};

export declare type ApiRoute = keyof ApiRoutesParams;
export declare type PageRoute = keyof PageRoutesParams;
export declare type Route = ApiRoute | PageRoute;
export declare type RoutesParams = ApiRoutesParams & PageRoutesParams;

export declare const getRoute: <T extends Route>() => T extends ApiRoute ? {
  getRequestParams: (request: NextApiRequest) => ApiRoutesParams[T];
} : {
  useRouter: () => { routeParams: PageRoutesParams[T] };
  getServerSideParams: (context: GetServerSidePropsContext) => PageRoutesParams[T];
};
`,
      {
        parser: "typescript",
        tabWidth: 4,
        trailingComma: "none",
      },
    ),
    "utf8",
  );
};

const program = new Command();

program
  .command("run", { isDefault: true })
  .description("generate the user types file and edit project files")
  .action(main);

program.parse(process.argv);
