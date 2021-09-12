import express = require("express");
import path = require("path");
import PodcastCompiler from "./PodcastCompiler";

const rssFilePath = path.resolve(__dirname, "..", "podcast", "rss.xml");
const episodePath = path.resolve(__dirname, "..", "podcast", "episodes");
const artPath = path.resolve(__dirname, "..", "podcast");

class PodcastServer {
    router = express();
    compiler: PodcastCompiler;

    constructor(options: ServerOptions) {
        const { port, host, rssURL, episodeURL, artURL } = options;
        this.compiler = new PodcastCompiler(host, episodePath, rssURL, episodeURL, artURL);

        this.router.get(rssURL, (req, res) => {
            res.sendFile(rssFilePath);
        });
        this.router.get(`${episodeURL}/:episodeID.mp3`, (req, res) => {
            const { episodeID } = req.params;
            const episodeFilePath = path.resolve(episodePath, `${episodeID}.mp3`);
            res.sendFile(episodeFilePath);
        });
        this.router.get(`${artURL}/:file.jpg`, (req, res) => {
            const { file } = req.params;
            const episodeFilePath = path.resolve(artPath, `${file}.jpg`);
            res.sendFile(episodeFilePath);
        });

        this.compiler.render(rssFilePath).then(() => {
            this.router.listen(port, () => {
                console.log(`RSS server open at ${rssURL} on ${port}`);
            });
        });
    }
}

export default PodcastServer;

export interface ServerOptions {
    host: string;
    rssURL: string;
    episodeURL: string;
    artURL: string;
    port: number;
}
