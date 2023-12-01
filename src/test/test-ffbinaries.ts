import ffBinaries from "../index.js";
import test from "node:test";
import assert from "assert";
import { exists } from "../utils.js";
import fs from "fs/promises";
// these tests work on windows

test("detect platform", () => {
    let platform = ffBinaries.detectPlatform();
    assert.strictEqual(platform, "windows-64");
});

test("get binary filename", () => {
    let filename = ffBinaries.getBinaryFilename("ffmpeg");
    assert.strictEqual(filename, "ffmpeg.exe");
});

test("list versions", async () => {
    let versions = await ffBinaries.listVersions();
    console.log("Versions", versions);
    assert.strictEqual(versions.indexOf("latest"), 0);
});

test("get version data", async () => {
    let data = await ffBinaries.getVersionData("4.0");
    assert.strictEqual(data.hasOwnProperty("version"), true);
    assert.strictEqual(data.hasOwnProperty("bin"), true);
});

test('download binaries', async () => {
    let files = await ffBinaries.downloadBinaries({
        components: ['ffmpeg'],
        destination: './',
        onProgress: p => console.log("Progress", p),
        overwrite: true,
    })
    console.log(files);
    assert.ok(files.hasOwnProperty('ffmpeg'));
    let fileExists = await exists(files['ffmpeg'])
    assert.ok(fileExists);
    let fileStat = await fs.stat(files['ffmpeg'])
    // check if file larger than 10 MB to see if it's not empty
    assert.ok(fileStat.size > 10000000)
})
