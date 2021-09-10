import express = require("express");
import path = require("path");
import PodcastCompiler from "./PodcastCompiler";

const rssURL = "/rss";
const episodeURL = "/ep";
const EPISODESFOLDER = path.resolve(__dirname, "episodes");
const rssFilePath = path.resolve(__dirname, "rss.xml");

class PodcastServer {
    router = express();
    compiler: PodcastCompiler;

    constructor(options: ServerOptions) {
        const { port, host } = options;
        this.compiler = new PodcastCompiler(host);
        this.compiler.render(rssFilePath).then(() => {
            this.start(port);
        });
    }

    start(port: number) {
        this.router.get(rssURL, (req, res) => {
            res.sendFile(rssFilePath);
        });
        this.router.get(`${episodeURL}/:episodeID.mp3`, (req, res) => {
            const { episodeID } = req.params;
            const episodeFilePath = path.resolve(EPISODESFOLDER, `${episodeID}.mp3`);
            res.sendFile(episodeFilePath);
        });
        this.router.get(`/s1-thumbnail.jpg`, (req, res) => {
            res.sendFile(path.join(__dirname, "s1-thumbnail.jpg"));
        });
        this.router.listen(port, () => {
            console.log(`RSS server open at ${rssURL} on ${port}`);
        });
    }
}

export default PodcastServer;

interface ServerOptions {
    host: string;
    port: number;
}
