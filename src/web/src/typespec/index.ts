import { createBrowserHost } from './brower-host';
import { BrowserHost } from './types';
import axios from 'axios';

const libs = [
    "@typespec/compiler",
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@typespec/openapi3",
    "@typespec/json-schema",
    "@typespec/protobuf",
    "@azure-tools/typespec-autorest",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azure-resource-manager",
  ]

  const outputDir = "tsp-output";

export async function get_typespec_rp_resources(resourceProviderUrl: string) {
    const host = await createBrowserHost(libs, {useShim: true})
    const res = await axios.get(resourceProviderUrl);
    const entryFiles = res.data.entryFiles;
    for (const entryFile of entryFiles) {
        await host.stat(entryFile);
        // const content = await axios.get(`/Swagger/Specs/Files/${entryFile}`);
        // host.writeFile(entryFile, content.data)
        await host.compiler.compile(host, entryFile, {
            outputDir: outputDir,
            emit: ["@azure-tools/typespec-autorest"]
        });
        await findOutputFiles(host);
        // let sourceFile = host.compiler.createSourceFile(entryFile, content.data, host.compiler.getSourceFileKindFromExt(entryFile));
        // let resources = host.compiler.getTypes(sourceFile);
        // for (let resource of resources) {
        //     console.log(resource);
        // }
    }
    // entryFiles.forEach(async (entryFile: string) => {
    //     content = await.axios
    // })
}

async function findOutputFiles(host: BrowserHost): Promise<string[]> {
    const files: string[] = [];
  
    async function addFiles(dir: string) {
      const items = await host.readDir(outputDir + dir);
      for (const item of items) {
        const itemPath = `${dir}/${item}`;
        if ((await host.stat(outputDir + itemPath)).isDirectory()) {
          await addFiles(itemPath);
        } else {
          files.push(dir === "" ? item : `${dir}/${item}`);
        }
      }
    }
    await addFiles("");
    return files;
  }