import fs from "fs";
import { finished } from "stream/promises";
import fetch from "node-fetch";
// @ts-ignore
import Progress from "node-fetch-progress";

export async function exists(file: string) {
    try {
        await fs.promises.stat(file);
        return true;
    } catch {
        return false;
    }
}

export async function downloadFile(url: string, file: string, onProgress = (_: { progress: number }) => {
}) {
    const response = await fetch(url);
    if (!response.ok || response.body === null)
        throw new Error(`Error reaching ffbinaries api: ${response.statusText}`);

    const progress = new Progress(response, { throttle: 100 });
    progress.on("progress", onProgress);
    const fileStream = fs.createWriteStream(file, { flags: "w" });
    await finished(response.body.pipe(fileStream));
}

export async function fetchJson<T>(url: string) {
    let response = await fetch(url);
    if (!response.ok)
        throw new Error(`Error reaching ffbinaries api: ${response.statusText}`);

    let result = await response.text();
    try {
        return JSON.parse(result) as T;
    } catch (e) {
        throw new Error(`Couldn't parse result from ffbinaries api: ${result}`);
    }
}
