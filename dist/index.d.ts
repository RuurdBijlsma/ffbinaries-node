declare function downloadBinaries({ destination, components, version, overwrite, onProgress, tempDirectory }: {
    destination?: string;
    components?: ("ffmpeg" | "ffprobe" | "ffplay")[];
    version?: string;
    overwrite?: boolean;
    onProgress?: (x: number) => void;
    tempDirectory?: string;
}): Promise<{
    [k: string]: string;
}>;
declare function getVersionData(version: string): Promise<{
    version: string;
    bin: {
        [key: string]: {
            [key: string]: string;
        };
    };
}>;
declare function listVersions(): Promise<string[]>;
declare function listPlatforms(): Promise<string[]>;
declare function detectPlatform(): "osx-64" | "windows-64" | "windows-32" | "linux-armel" | "linux-64" | "linux-32";
declare function getBinaryFilename(component?: string): string;
declare const _default: {
    detectPlatform: typeof detectPlatform;
    listPlatforms: typeof listPlatforms;
    listVersions: typeof listVersions;
    getVersionData: typeof getVersionData;
    getBinaryFilename: typeof getBinaryFilename;
    downloadBinaries: typeof downloadBinaries;
};

export { _default as default, detectPlatform, downloadBinaries, getBinaryFilename, getVersionData, listPlatforms, listVersions };
