import { formatHTML, formatDuration, formatPubDate } from "./podcast-util";
import { JSDOM } from "jsdom";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import fs from "./fs-promise";
import path = require("path");

class PodcastCompiler {
    dom: JSDOM;
    document: Document;
    host: string;
    audioPath: string;

    constructor(host: string, audioPath: string) {
        this.host = host;
        this.audioPath = audioPath;
        this.dom = new JSDOM(
            `<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"></rss>`,
            { contentType: "text/xml" }
        );
        this.document = this.dom.window.document;
    }

    async buildRSS(host: string) {
        const document = this.document;
        const rssNode = document.getElementsByTagName("rss")[0];

        const optionsFile = path.join(__dirname, "podcast.json");
        const text = await fs.readFile(optionsFile, "utf-8");
        const data = JSON.parse(text) as PodcastData;
        const { feed, items } = data;
        const { title, description, copyright, webMaster, siteURL, links } = feed;

        console.log(`Compiling ${title} RSS feed using hostname ${host}`);

        const descriptionDOM = new JSDOM(`<div></div>`);
        const descriptionDocument = descriptionDOM.window.document;
        const div = descriptionDocument.getElementsByTagName("div")[0];

        div.appendChild(this.newTag("p", description));
        const linksElement = document.createElement("p");
        div.appendChild(linksElement);
        links.forEach((c) => {
            linksElement.appendChild(document.createTextNode(c));
            linksElement.appendChild(document.createElement("br"));
        });

        const thumbnailURL = `${host}/s1-thumbnail.jpg`;

        const channelNode = document.createElement("channel");
        rssNode.appendChild(channelNode);

        channelNode.appendChild(this.newTag("title", title));
        channelNode.appendChild(this.newTag("description", formatHTML(div.innerHTML), true));
        channelNode.appendChild(this.newTag("copyright", copyright, true));
        channelNode.appendChild(this.newTag("language", "en"));
        channelNode.appendChild(this.newTag("generator", `POTM Server ${process.version}`));
        channelNode.appendChild(this.newTag("link", siteURL));
        channelNode.appendChild(this.newTag("docs", siteURL));
        channelNode.appendChild(this.newTag("managingEditor", webMaster));
        channelNode.appendChild(this.newTag("itunes:type", "serial"));

        const itunesImage = document.createElement("itunes:image");
        channelNode.appendChild(itunesImage);
        itunesImage.setAttribute("href", thumbnailURL);

        const imageElement = document.createElement("image");
        channelNode.appendChild(imageElement);
        imageElement.appendChild(this.newTag("url", thumbnailURL));
        imageElement.appendChild(this.newTag("title", title));
        imageElement.appendChild(this.newTag("link", siteURL));

        const itunesOwner = document.createElement("itunes:owner");
        channelNode.appendChild(itunesOwner);
        itunesOwner.appendChild(this.newTag("itunes:name", title));
        itunesOwner.appendChild(this.newTag("itunes:email", webMaster));

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemElement = await this.newItem(item, host, links, thumbnailURL);
            channelNode.appendChild(itemElement);
        }
    }

    async newItem(item: EpisodeData, host: string, links: string[], thumbnailURL: string) {
        const document = this.document;
        const { season, episode, title, description, date, id, cast, credits } = item;

        const descriptionDOM = new JSDOM(`<div></div>`);
        const descriptionDocument = descriptionDOM.window.document;
        const div = descriptionDocument.getElementsByTagName("div")[0];

        const descriptionElement = document.createElement("p");
        div.appendChild(descriptionElement);
        descriptionElement.textContent = description;

        const castElement = document.createElement("p");
        div.appendChild(castElement);
        cast.forEach((c) => {
            castElement.appendChild(document.createTextNode(c));
            castElement.appendChild(document.createElement("br"));
        });

        const creditsElement = document.createElement("p");
        div.appendChild(creditsElement);
        credits.forEach((c) => {
            creditsElement.appendChild(document.createTextNode(c));
            creditsElement.appendChild(document.createElement("br"));
        });

        const linksElement = document.createElement("p");
        div.appendChild(linksElement);
        links.forEach((c) => {
            linksElement.appendChild(document.createTextNode(c));
            linksElement.appendChild(document.createElement("br"));
        });

        const url = `${host}/ep/${id}.mp3`;
        const pubDate = formatPubDate(new Date(date));
        const audioFile = path.join(this.audioPath, `${id}.mp3`);

        const audioInfo = (await ffprobe(audioFile, { path: ffprobeStatic.path })).streams[0];
        const type = `${audioInfo.codec_type}/${audioInfo.codec_name}`;
        const bytes = (await fs.stat(this.audioPath)).size;

        const itemElement = document.createElement("item");
        itemElement.appendChild(this.newTag("title", `S${season} E${episode} - ${title}`));
        itemElement.appendChild(this.newTag("itunes:title", title));
        itemElement.appendChild(this.newTag("itunes:season", `${season}`));
        itemElement.appendChild(this.newTag("itunes:episode", `${episode}`));
        itemElement.appendChild(this.newTag("pubDate", pubDate));
        itemElement.appendChild(this.newTag("description", formatHTML(div.innerHTML), true));
        itemElement.appendChild(this.newTag("itunes:duration", formatDuration(audioInfo.duration)));
        itemElement.appendChild(this.newTag("itunes:author", "Pods of the Multiverse"));
        itemElement.appendChild(this.newTag("itunes:explicit", "no"));
        itemElement.appendChild(this.newTag("itunes:episodeType", "full"));
        itemElement.appendChild(this.newTag("itunes:summary", description));

        const itunesImage = document.createElement("itunes:image");
        itemElement.appendChild(itunesImage);
        itunesImage.setAttribute("href", thumbnailURL);

        const enclosureElement = document.createElement("enclosure");
        enclosureElement.setAttribute("length", String(bytes));
        enclosureElement.setAttribute("type", type);
        enclosureElement.setAttribute("url", url);
        itemElement.appendChild(enclosureElement);

        return itemElement;
    }

    newTag(tagName: string, content: string, cdata: boolean = false) {
        const document = this.document;
        const element = document.createElement(tagName);
        if (cdata) {
            const contentNode = document.createCDATASection(content);
            element.appendChild(contentNode);
        } else {
            const contentNode = document.createTextNode(content);
            element.appendChild(contentNode);
        }
        return element;
    }

    async render(rssFilePath: string) {
        const podcastDeclaration = `<?xml version="1.0" encoding="UTF-8"?>`;
        await this.buildRSS(this.host);
        fs.writeFile(rssFilePath, podcastDeclaration + this.dom.serialize());
    }
}

export default PodcastCompiler;

interface PodcastData {
    feed: {
        title: string;
        description: string;
        copyright: string;
        siteURL: string;
        webMaster: string;
        links: string[];
    };
    items: EpisodeData[];
}

interface EpisodeData {
    season: number;
    episode: number;
    title: string;
    description: string;
    date: number;
    id: string;
    cast: string[];
    credits: string[];
}
