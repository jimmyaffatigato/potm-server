import fs from "./lib/fs-promise";
import path from "path";
import PodcastServer, { ServerOptions } from "./lib/PodcastServer";

loadSettings(path.join(__dirname, "settings.json")).then((settings) => {
    new PodcastServer(settings);
});

export default {};

async function loadSettings(path: string): Promise<ServerOptions> {
    const text = await fs.readFile(path, "utf-8");
    return JSON.parse(text) as ServerOptions;
}
