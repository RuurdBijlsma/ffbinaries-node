import { downloadFile, exists, fetchJson } from "./utils.js";
import path from "path";
import os from "os";
import extractZip from "extract-zip";
import fs from "fs/promises";

const API_URL = `https://ffbinaries.com/api/v1`;

export async function downloadBinaries(
  {
      destination = ".",
      components = ["ffmpeg", "ffprobe", "ffplay"],
      version = "latest",
      overwrite = false,
      onProgress = () => {
      },
      tempDirectory = destination
  }: {
      destination?: string,
      components?: ("ffmpeg" | "ffprobe" | "ffplay")[],
      version?: string,
      overwrite?: boolean,
      onProgress?: (x: number) => void,
      tempDirectory?: string
  }
) {
    let componentData = components.map(c => ({
        component: c,
        filePath: path.resolve(path.join(destination, getBinaryFilename(c))),
        zipPath: path.resolve(path.join(tempDirectory, `${c}.zip`)),
        tempFilePath: path.resolve(path.join(tempDirectory, getBinaryFilename(c)))
    }));
    let missingComponents = [];
    for (let data of componentData) {
        if (!overwrite && await exists(data.filePath))
            continue;
        missingComponents.push(data);
    }

    let versionData = await getVersionData(version);
    let platform = detectPlatform();
    if (!versionData["bin"].hasOwnProperty(platform))
        throw new Error("Got invalid json from ffbinaries api");

    let urls = versionData["bin"][platform];
    let validComponents = missingComponents.filter(c => urls.hasOwnProperty(c.component));

    let progresses = validComponents.map(() => 0);
    let progressFn = (p: { progress: number }, index: number) => {
        progresses[index] = p.progress;
        onProgress(
          progresses.reduce((acc, v) => acc + v) / progresses.length
        );
    };
    await Promise.all(
      validComponents.map(async (data, index) => {
          await downloadFile(
            urls[data.component],
            data.zipPath,
            p => progressFn(p, index)
          );
          await extractZip(data.zipPath, {
              dir: path.resolve(tempDirectory)
          });
          await fs.unlink(data.zipPath);
          await fs.rename(data.tempFilePath, data.filePath);
      })
    );

    return Object.fromEntries(componentData
      .filter(c => urls.hasOwnProperty(c.component))
      .map(data => [data.component, data.filePath]));
}

export function getVersionData(version: string) {
    return fetchJson<{
        version: string,
        bin: { [key: string]: { [key: string]: string } }
    }>(API_URL + "/version/" + version);
}

export async function listVersions() {
    return Object.keys(
      (await fetchJson<{ [key: string]: string }>(API_URL)).versions
    );
}

export async function listPlatforms() {
    return ["osx-64", "linux-32", "linux-64", "linux-armel", "linux-armhf", "windows-32", "windows-64"];
}

export function detectPlatform() {
    const type = os.type().toLowerCase();
    const arch = os.arch().toLowerCase();

    if (type === "darwin") {
        return "osx-64";
    }

    if (type === "windows_nt") {
        return arch === "x64" ? "windows-64" : "windows-32";
    }

    if (type === "linux") {
        if (arch === "arm" || arch === "arm64") {
            return "linux-armel";
        }
        return arch === "x64" ? "linux-64" : "linux-32";
    }

    throw new Error("Could not detect platform");
}

export function getBinaryFilename(component = "ffmpeg") {
    return detectPlatform().startsWith("windows") ? component + ".exe" : component;
}


export default {
    detectPlatform,
    listPlatforms,
    listVersions,
    getVersionData,
    getBinaryFilename,
    downloadBinaries
};
