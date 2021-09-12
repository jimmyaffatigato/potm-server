import { formatHTML, formatDuration, formatPubDate } from "./podcast-util";
import { JSDOM } from "jsdom";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import fs from "./fs-promise";
import path = require("path");

class PodcastCompiler {
    dom: JSDOM;
    document: Document;

    constructor(host: string, episodePath: string, rssURL: string, episodeURL: string, artURL: string) {
        this.dom = new JSDOM(
            `<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"></rss>`,
            { contentType: "text/xml" }
        );
        this.document = this.dom.window.document;
        this.buildRSS(host, episodePath, rssURL, episodeURL, artURL);
    }

    async buildRSS(host: string, episodePath: string, rssURL: string, episodeURL: string, artURL: string) {
        const document = this.document;
        const rssNode = document.getElementsByTagName("rss")[0];

        const optionsFile = path.join(__dirname, "..", "podcast", "podcast.json");
        const text = await fs.readFile(optionsFile, "utf-8");
        const data = JSON.parse(text) as PodcastData;
        const { feed, items } = data;
        const { title, description, copyright, webMaster, siteURL, links } = feed;

        console.log(`Compiling ${title} RSS feed using hostname ${host}`);

        const descriptionDOM = new JSDOM(`<div></div>`);
        const descriptionDocument = descriptionDOM.window.document;
        const div = descriptionDocument.getElementsByTagName("div")[0];

        div.appendChild(newTag("p", description));
        const linksElement = document.createElement("p");
        div.appendChild(linksElement);
        links.forEach((c) => {
            linksElement.appendChild(document.createTextNode(c));
            linksElement.appendChild(document.createElement("br"));
        });

        const thumbnailURL = `${host}/${artURL}/s1-thumbnail.jpg`;

        const channelNode = document.createElement("channel");
        rssNode.appendChild(channelNode);

        channelNode.appendChild(newTag("title", title));
        channelNode.appendChild(newTag("description", formatHTML(div.innerHTML), true));
        channelNode.appendChild(newTag("copyright", copyright, true));
        channelNode.appendChild(newTag("language", "en"));
        channelNode.appendChild(newTag("generator", `POTM Server ${process.version}`));
        channelNode.appendChild(newTag("link", siteURL));
        channelNode.appendChild(newTag("docs", siteURL));
        channelNode.appendChild(newTag("managingEditor", webMaster));
        channelNode.appendChild(newTag("itunes:type", "serial"));

        const itunesImage = document.createElement("itunes:image");
        channelNode.appendChild(itunesImage);
        itunesImage.setAttribute("href", thumbnailURL);

        const imageElement = document.createElement("image");
        channelNode.appendChild(imageElement);
        imageElement.appendChild(newTag("url", thumbnailURL));
        imageElement.appendChild(newTag("title", title));
        imageElement.appendChild(newTag("link", siteURL));

        const itunesOwner = document.createElement("itunes:owner");
        channelNode.appendChild(itunesOwner);
        itunesOwner.appendChild(newTag("itunes:name", title));
        itunesOwner.appendChild(newTag("itunes:email", webMaster));

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemElement = await newItem(item, host, links, thumbnailURL);
            channelNode.appendChild(itemElement);
        }

        async function newItem(item: EpisodeData, host: string, links: string[], thumbnailURL: string) {
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

            const url = `${host}/${episodeURL}/${id}.mp3`;
            const pubDate = formatPubDate(new Date(date));
            const audioFile = path.join(episodePath, `${id}.mp3`);

            const audioInfo = (await ffprobe(audioFile, { path: ffprobeStatic.path })).streams[0];
            const type = `${audioInfo.codec_type}/${audioInfo.codec_name}`;
            const bytes = (await fs.stat(episodePath)).size;

            const itemElement = document.createElement("item");
            itemElement.appendChild(newTag("title", `S${season} E${episode} - ${title}`));
            itemElement.appendChild(newTag("itunes:title", title));
            itemElement.appendChild(newTag("itunes:season", `${season}`));
            itemElement.appendChild(newTag("itunes:episode", `${episode}`));
            itemElement.appendChild(newTag("pubDate", pubDate));
            itemElement.appendChild(newTag("description", formatHTML(div.innerHTML), true));
            itemElement.appendChild(newTag("itunes:duration", formatDuration(audioInfo.duration)));
            itemElement.appendChild(newTag("itunes:author", "Pods of the Multiverse"));
            itemElement.appendChild(newTag("itunes:explicit", "no"));
            itemElement.appendChild(newTag("itunes:episodeType", "full"));
            itemElement.appendChild(newTag("itunes:summary", description));

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

        function newTag(tagName: string, content: string, cdata: boolean = false) {
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
    }

    async render(rssFilePath: string) {
        const podcastDeclaration = `<?xml version="1.0" encoding="UTF-8"?>`;
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
