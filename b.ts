import * as fs from "fs";
import * as child_process from "child_process";
import * as path from "path";

const workdir = "/Users/shinku/Desktop/pout/work";

function execCommand(command: string): Promise<number> {
    return new Promise<number>(resolve => {
        const proc = child_process.exec(command);
        let out = "";
        let err = "";
        proc.stdout.on("data", chunk => {
            out = out + chunk.toString();
        });
        proc.stderr.on("data", chunk => {
            err = err + chunk.toString();
        });
        proc.on("exit", code => {
            if(code != 0){
                console.log(out);
                console.error(err);
            }
            resolve(code);
        });
    });
}

async function handleFile(jsonName: string, imageName: string) {
    const meta = JSON.parse((await fs.promises.readFile(jsonName)).toString());
    const CreateDate = formatDate(meta.creationTime.timestamp);
    const DateTimeOriginal = formatDate(meta.photoTakenTime.timestamp);
    const ModifyDate = formatDate(meta.photoLastModifiedTime.timestamp);
    const command = `exiftool -CreateDate="${CreateDate}" -DateTimeOriginal="${DateTimeOriginal}" -ModifyDate="${ModifyDate}" ${imageName}`;
    console.log(command);
    await execCommand(command);
}

function formatDate(time: number) {
    const t = new Date(time * 1000);
    const zf = (n: number, digits: number) => {
        return n.toString().padStart(digits, "0");
    };
    return `${zf(t.getUTCFullYear(), 4)}:${zf(t.getUTCMonth() + 1, 2)}:${zf(t.getUTCDate(), 2)} ${zf(t.getUTCHours(), 2)}:${zf(t.getUTCMinutes(), 2)}:${zf(t.getUTCSeconds(), 2)}`;
}

async function matchJsonImage(files: string[]) {
    let json = new Map<string, string>();
    let image = new Map<string, string>();
    for (const e of files) {
        const p = path.parse(e);
        if (p.ext == ".json") {
            json.set(p.name, e);
        } else {
            image.set(p.name, e);
        }
    }
    console.log(image.size);
    console.log(json.size);
    let r = new Map<string, string>();
    for (const [k, v] of json.entries()) {
        if(image.has(k)) {
            r.set(v, image.get(k));
        }else{
            console.error(k);
        }
    }
    return r;
}

async function processDir(dirname) {
    const d = (await fs.promises.readdir(dirname)).map(value => workdir + "/" + value);
    const p = await matchJsonImage(d);
    for (const [k, v] of p) {
        await handleFile(k, v);
    }
}

processDir(workdir);