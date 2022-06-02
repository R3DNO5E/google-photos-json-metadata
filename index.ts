import * as fs from "fs"
import * as path from "path"

const inputPath = "/Users/shinku/Desktop/Google Photos";
const outputPath = "/Users/shinku/Desktop/pout";

async function globDir(dir: string) {
    let excludes = new Set<string>([".DS_Store", "print-order.pdf", "metadata.json", "user-generated-memory-titles.json", "shared_album_comments.json", "print-subscriptions.json"]);
    let queue = [dir];
    let files: string[] = [];
    while (queue.length > 0) {
        const entry = queue.pop();
        const stat = await fs.promises.stat(entry);
        if (stat.isFile()) {
            const p = path.parse(entry);
            if (!excludes.has(p.base)) {
                files.push(entry);
            }
        } else if (stat.isDirectory()) {
            (await fs.promises.readdir(entry)).forEach((value => {
                queue.push(entry + "/" + value);
            }));
        }
    }
    return files;
}

function getImageFilenameIndex(originalPath: string, index: number = 0) {
    let appends = ""
    if (index != 0) {
        appends = "(" + index.toString() + ")";
    }
    const p = path.parse(originalPath);
    const basenameLen = 51 - p.ext.length - appends.length;
    return p.dir +
        p.name.substring(0, basenameLen)
            .replace("'", "_")
            .replace(":", "_")
        + appends + p.ext;
}

function getJsonFilenameIndex(originalPath: string, index: number = 0) {
    return getImageFilenameIndex(originalPath + ".json", index);
}

async function getJsonTitle(json: string): Promise<string | undefined> {
    const jsonText = (await fs.promises.readFile(json)).toString("utf-8");
    const title = JSON.parse(jsonText).title;
    if (typeof title !== 'string') {
        return;
    }
    return title;
}

async function pairJsonImage(files: string[]) {
    const json = new Set<string>();
    const image = new Set<string>();
    for (const [k, v] of files.entries()) {
        if (path.parse(v).ext.toLowerCase() === ".json") {
            json.add(v);
        } else {
            image.add(v);
        }
    }
    let pair = new Map<string, string>();
    for (const [k, v] of json.entries()) {
        const original = await getJsonTitle(k);
        let possiblePair = new Map<string, string>();
        for (let i = 0; i < 100; i++) {
            if (getJsonFilenameIndex(original, i) == path.parse(k).base && image.has(path.parse(k).dir + "/" + getImageFilenameIndex(original, i))) {
                possiblePair.set(k, path.parse(k).dir + "/" + getImageFilenameIndex(original, i));
            }
        }
        if (possiblePair.size == 1) {
            const t = possiblePair.entries().next().value;
            pair.set(t[0], t[1]);
            json.delete(t[0]);
            image.delete(t[1]);
        }
    }
    console.log(json);
    console.log(image);
    return pair;
}

async function moveFile(oldPath, newPath) {
    await fs.promises.rename(oldPath, newPath);
}


globDir(inputPath).then(async result => {
    let pair = await pairJsonImage(result);
    let count = 0;
    for (const [key, value] of pair.entries()) {
        await moveFile(key, outputPath + "/" + count + ".json");
        await moveFile(value, outputPath + "/" + count + path.parse(value).ext);
        count++;
    }
});
