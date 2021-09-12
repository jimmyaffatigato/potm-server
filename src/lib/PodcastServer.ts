import express = require("express");
import path = require("path");
import PodcastCompiler from "./PodcastCompiler";

const episodeURL = "/ep";
const rssFilePath = path.resolve(__dirname, "rss.xml");

class PodcastServer {
    router = express();
    compiler: PodcastCompiler;
    url: string;
    port: number;

    constructor(options: ServerOptions) {
        const { port, host, audioPath, url } = options;
        this.url = url;
        this.port = port;
        this.compiler = new PodcastCompiler(host, path.resolve(__dirname, audioPath));
        this.compiler.render(rssFilePath).then(() => {
            this.start();
        });
    }

    start() {
        this.router.get(this.url, (req, res) => {
            res.sendFile(rssFilePath);
        });
        this.router.get(`${episodeURL}/:episodeID.mp3`, (req, res) => {
            const { episodeID } = req.params;
            const episodeFilePath = path.resolve(this.compiler.audioPath, `${episodeID}.mp3`);
            res.sendFile(episodeFilePath);
        });
        this.router.get(`/s1-thumbnail.jpg`, (req, res) => {
            res.sendFile(path.join(__dirname, "s1-thumbnail.jpg"));
        });
        this.router.listen(this.port, () => {
            console.log(`RSS server open at ${this.url} on ${this.port}`);
        });
    }
}

export default PodcastServer;

export interface ServerOptions {
    host: string;
    url: string;
    port: number;
    audioPath: string;
}
