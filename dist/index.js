// src/utils.ts
import fs from "fs";
import { finished } from "stream/promises";
import fetch from "node-fetch";
import Progress from "node-fetch-progress";
async function exists(file) {
  try {
    await fs.promises.stat(file);
    return true;
  } catch {
    return false;
  }
}
async function downloadFile(url, file, onProgress = (_) => {
}) {
  const response = await fetch(url);
  if (!response.ok || response.body === null)
    throw new Error(`Error reaching ffbinaries api: ${response.statusText}`);
  const progress = new Progress(response, { throttle: 100 });
  progress.on("progress", onProgress);
  const fileStream = fs.createWriteStream(file, { flags: "w" });
  await finished(response.body.pipe(fileStream));
}
async function fetchJson(url) {
  let response = await fetch(url);
  if (!response.ok)
    throw new Error(`Error reaching ffbinaries api: ${response.statusText}`);
  let result = await response.text();
  try {
    return JSON.parse(result);
  } catch (e) {
    throw new Error(`Couldn't parse result from ffbinaries api: ${result}`);
  }
}

// src/index.ts
import path from "path";
import os from "os";
import extractZip from "extract-zip";
import fs2 from "fs/promises";
var API_URL = `https://ffbinaries.com/api/v1`;
async function downloadBinaries({
  destination = ".",
  components = ["ffmpeg", "ffprobe", "ffplay"],
  version = "latest",
  overwrite = false,
  onProgress = () => {
  },
  tempDirectory = destination
}) {
  let componentData = components.map((c) => ({
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
  let validComponents = missingComponents.filter((c) => urls.hasOwnProperty(c.component));
  let progresses = validComponents.map(() => 0);
  let progressFn = (p, index) => {
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
        (p) => progressFn(p, index)
      );
      await extractZip(data.zipPath, {
        dir: path.resolve(tempDirectory)
      });
      await fs2.unlink(data.zipPath);
      if (detectPlatform().startsWith("linux"))
        await fs2.chmod(data.tempFilePath, 755);
      await fs2.rename(data.tempFilePath, data.filePath);
    })
  );
  return Object.fromEntries(componentData.filter((c) => urls.hasOwnProperty(c.component)).map((data) => [data.component, data.filePath]));
}
function getVersionData(version) {
  return fetchJson(API_URL + "/version/" + version);
}
async function listVersions() {
  return Object.keys(
    (await fetchJson(API_URL)).versions
  );
}
async function listPlatforms() {
  return ["osx-64", "linux-32", "linux-64", "linux-armel", "linux-armhf", "windows-32", "windows-64"];
}
function detectPlatform() {
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
function getBinaryFilename(component = "ffmpeg") {
  return detectPlatform().startsWith("windows") ? component + ".exe" : component;
}
var src_default = {
  detectPlatform,
  listPlatforms,
  listVersions,
  getVersionData,
  getBinaryFilename,
  downloadBinaries
};
export {
  src_default as default,
  detectPlatform,
  downloadBinaries,
  getBinaryFilename,
  getVersionData,
  listPlatforms,
  listVersions
};
//# sourceMappingURL=index.js.map