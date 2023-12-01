"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default,
  detectPlatform: () => detectPlatform,
  downloadBinaries: () => downloadBinaries,
  getBinaryFilename: () => getBinaryFilename,
  getVersionData: () => getVersionData,
  listPlatforms: () => listPlatforms,
  listVersions: () => listVersions
});
module.exports = __toCommonJS(src_exports);

// src/utils.ts
var import_fs = __toESM(require("fs"), 1);
var import_promises = require("stream/promises");
var import_node_fetch = __toESM(require("node-fetch"), 1);
var import_node_fetch_progress = __toESM(require("node-fetch-progress"), 1);
async function exists(file) {
  try {
    await import_fs.default.promises.stat(file);
    return true;
  } catch {
    return false;
  }
}
async function downloadFile(url, file, onProgress = (_) => {
}) {
  const response = await (0, import_node_fetch.default)(url);
  if (!response.ok || response.body === null)
    throw new Error(`Error reaching ffbinaries api: ${response.statusText}`);
  const progress = new import_node_fetch_progress.default(response, { throttle: 100 });
  progress.on("progress", onProgress);
  const fileStream = import_fs.default.createWriteStream(file, { flags: "w" });
  await (0, import_promises.finished)(response.body.pipe(fileStream));
}
async function fetchJson(url) {
  let response = await (0, import_node_fetch.default)(url);
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
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_extract_zip = __toESM(require("extract-zip"), 1);
var import_promises2 = __toESM(require("fs/promises"), 1);
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
    filePath: import_path.default.resolve(import_path.default.join(destination, getBinaryFilename(c))),
    zipPath: import_path.default.resolve(import_path.default.join(tempDirectory, `${c}.zip`)),
    tempFilePath: import_path.default.resolve(import_path.default.join(tempDirectory, getBinaryFilename(c)))
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
      await (0, import_extract_zip.default)(data.zipPath, {
        dir: import_path.default.resolve(tempDirectory)
      });
      await import_promises2.default.unlink(data.zipPath);
      if (detectPlatform().startsWith("linux"))
        await import_promises2.default.chmod(data.tempFilePath, "+x");
      await import_promises2.default.rename(data.tempFilePath, data.filePath);
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
  const type = import_os.default.type().toLowerCase();
  const arch = import_os.default.arch().toLowerCase();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectPlatform,
  downloadBinaries,
  getBinaryFilename,
  getVersionData,
  listPlatforms,
  listVersions
});
//# sourceMappingURL=index.cjs.map