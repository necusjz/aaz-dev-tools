import {repoRoot} from "../../src/typespec/eng/scripts/helpers.js";
import { findWorkspacePackagesNoCheck } from "@pnpm/find-workspace-packages";
import { createTypeSpecBundle } from "../../src/typespec/core/packages/bundler/dist/src/index.js";
import { resolve } from "path";
import { existsSync, readdirSync, lstatSync, unlinkSync, rmdirSync, mkdirSync, copyFileSync} from 'fs';
import { join } from "path/posix";
import { writeFile } from "fs/promises";

const staticDir = resolve(repoRoot, "../aaz_dev/ui");
removeDirRecursive(staticDir);
mkdirSync(staticDir);
function copyFiles(source, destination) {
  readdirSync(source).forEach(file => {
      const sourcePath = resolve(source, file);
      const destPath = resolve(destination, file);

      if (lstatSync(sourcePath).isDirectory()) {
          // If it's a directory, create it in the destination and copy its contents
          mkdirSync(destPath);
          copyFiles(sourcePath, destPath);
      } else {
          // If it's a file, copy it to the destination
          copyFileSync(sourcePath, destPath);
      }
  });
}

copyFiles(resolve(repoRoot, "../web/dist"), staticDir);

const outputDir = resolve(repoRoot, "../aaz_dev/ui/assets/typespec/pkgs");
const pkgsUrl = "/assets/typespec/pkgs"

const packages = [
  "typespec-aaz",
  "@typespec/compiler",
  "@typespec/http",
  "@typespec/rest",
  "@typespec/openapi",
  "@typespec/versioning",
  "@typespec/openapi3",
  "@typespec/json-schema",
  "@typespec/protobuf",
  "@typespec/streams",
  "@azure-tools/typespec-autorest",
  "@azure-tools/typespec-azure-core",
  "@azure-tools/typespec-client-generator-core",
  "@azure-tools/typespec-azure-resource-manager",
];

const extern_packages = [
  "../../node_modules/@azure-tools/typespec-liftr-base",
]

function removeDirRecursive(dirPath) {
  if (existsSync(dirPath)) {
    readdirSync(dirPath).forEach((file) => {
      const curPath = join(dirPath, file);
      if (lstatSync(curPath).isDirectory()) {
        // Recursively remove subdirectories
        removeDirRecursive(curPath);
      } else {
        // Delete file
        unlinkSync(curPath);
      }
    });
    // Delete the directory itself
    rmdirSync(dirPath);
  }
}
removeDirRecursive(outputDir);

console.log(`Output Dir: ${outputDir}`);

async function syncManifest(manifest) {
  const d = join(outputDir, manifest.name)
  if (!existsSync(d)) {
    mkdirSync(d, { recursive: true });
  }
  const filePath = join(d, `manifest.json`);
  const content = JSON.stringify(manifest);
  try {
    await writeFile(filePath, content);
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
  }
}

async function syncJsFile(pkgName, file) {
  const d = join(outputDir, pkgName)
  if (!existsSync(d)) {
    mkdirSync(d, { recursive: true });
  }
  const filePath = join(d, file.filename);
  const content = file.content;
  try {
    await writeFile(filePath, content);
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
  }
}

async function syncIndex(index) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const filePath = join(outputDir, `index.json`);
  const content = JSON.stringify(index);
  try {
    await writeFile(filePath, content);
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
  }
}

function normalizePath(path) {
  return path.replace(/\\/g, "/");
}

async function syncPackage({ manifest, files }) {
  const imports = Object.fromEntries(
    Object.entries(manifest.imports).map(([key, value]) => {
      return [
        key,
        pkgsUrl + "/" + normalizePath(join(manifest.name, value)),
      ];
    })
  );
  await syncManifest(manifest);
  for (const file of files) {
    await syncJsFile(manifest.name, file);
  }
  return { status: "uploaded", imports };
}

async function syncTypespecPackages() {
  console.log(`Repo root: ${repoRoot}`);
  const allProjects = await findWorkspacePackagesNoCheck(repoRoot);
  const projects = allProjects.filter((x) => packages.includes(x.manifest.name));
  for (const extern_source of extern_packages) {
    const extern_projects = await findWorkspacePackagesNoCheck(resolve(repoRoot, extern_source));
    projects.push(...extern_projects);
  }
  const typespec_aaz = await findWorkspacePackagesNoCheck(resolve(repoRoot, "../typespec-aaz"));
  projects.push(...typespec_aaz);

  const importMap = {};
  for (const project of projects) {
    const bundle = await createTypeSpecBundle(resolve(repoRoot, project.dir));
    const manifest = bundle.manifest;
    const result = await syncPackage(bundle);
    console.log(`Bundle for package ${manifest.name}@${manifest.version} synced.`);
    for (const [key, value] of Object.entries(result.imports)) {
      importMap[join(project.manifest.name, key)] = value;
    }
  }
  console.log(`Import map:`, importMap);
  syncIndex({
    "imports": importMap,
  });
  console.log(`Updated index.json.`);
}

await syncTypespecPackages();
