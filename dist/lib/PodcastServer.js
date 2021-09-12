"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const PodcastCompiler_1 = __importDefault(require("./PodcastCompiler"));
const rssFilePath = path.resolve(__dirname, "..", "podcast", "rss.xml");
const episodePath = path.resolve(__dirname, "..", "podcast", "episodes");
const artPath = path.resolve(__dirname, "..", "podcast");
class PodcastServer {
    constructor(options) {
        this.router = express();
        const { port, host, rssURL, episodeURL, artURL } = options;
        this.compiler = new PodcastCompiler_1.default(host, episodePath, rssURL, episodeURL, artURL);
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
exports.default = PodcastServer;
