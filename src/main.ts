import fs from "./lib/fs-promise";
import path = require("path");
import PodcastServer, { ServerOptions } from "./lib/PodcastServer";

const SETTINGSPATH = path.join(__dirname, "settings.json");

loadSettings(SETTINGSPATH).then((settings) => {
    console.log(`Loaded settings from ${SETTINGSPATH}`);
    new PodcastServer(settings);
});

export default {};

async function loadSettings(path: string): Promise<ServerOptions> {
    const text = await fs.readFile(path, "utf-8");
    return JSON.parse(text) as ServerOptions;
}
