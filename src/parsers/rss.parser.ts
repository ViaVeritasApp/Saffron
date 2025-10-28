import rssParser  from "rss-parser";
import type {AxiosResponse} from "axios";
import { Parser } from "../types/parser.js";
import {Source} from "../types/source.js";
import { Article } from "../types/article.js";
import {cleanupHTMLText} from "../utils/decode.js";
import {extractLinks} from "../utils/html.js";

export type RssInstructions = {
    extra_fields: string[];
    assign_fields: {
        [assign: string]: string;
    };
}

export class RssParser extends Parser<RssInstructions> {
    static id = 'rss';

    validate(s?: any): void {
        // This exists only for typescript, it is not valid and will not run at runtime.
        const scrape = s as RssInstructions;

        if (typeof scrape !== 'undefined') {
            if (typeof scrape !== 'object' || Array.isArray(scrape))
                throw new Error("must be a JSON object");

            if (typeof scrape.extra_fields !== 'undefined' && !Array.isArray(scrape.extra_fields))
                throw new Error('extraFields must be an array of string');

            if (typeof scrape.assign_fields !== 'undefined' && (typeof scrape.assign_fields !== 'object' || Array.isArray(scrape.assign_fields)))
                throw new Error('assignFields must be a JSON object');
        }
    }

    preprocess(data: RssInstructions): RssInstructions {
        data = data ?? {};
        data.extra_fields ??= [];
        data.assign_fields ??= {};
        return data;
    }

    async parse(source: Source<RssInstructions>, response: any): Promise<Article[]> {
        const instructions = source.instructions;

        const assignFields = instructions.assign_fields;
        const extraFields = instructions.extra_fields;

        // Default fields & extra fields
        const requestFields: string[] = ["title", "link", "content", "pubDate", "categories", "media:thumbnail", 'media:content', ...extraFields];
        const parser = new rssParser({
            customFields: {
                // Make sure to request all the mentioned fields
                item: requestFields
            }
        });

        const feed = await parser.parseString((response as AxiosResponse).data);

        const articles: Article[] = [];
        let count = 0;
        for (const item of feed.items) {
            if (count >= source.options?.articles?.amount!) break;
            count++;

            // Initializing json object
            const data: any = {};

            // Copy all requested fields except the ones inside the assignFields keys
            for (const field of requestFields) {
                if (!Object.keys(assignFields).includes(field) && item[field] !== undefined)
                    data[field] = item[field];
            }

            // Assign all renamed fields to data object
            for (const customField in assignFields) {
                data[customField] = item[assignFields[customField]];
            }

            const article = {
                categories: [],
                attachments: [],
                extra: {},
            } as Partial<Article>;

            article.title = cleanupHTMLText(data.title ?? "", true);
            article.content = cleanupHTMLText(data.content ?? "", false);
            article.url = cleanupHTMLText(data.link ?? "", false);
            article.publication_date = cleanupHTMLText(data.pubDate ?? "", false);

            delete data.link;
            delete data.pubDate;

            article.thumbnail_url = data.thumbnail
                ?? this.getUrlFromMedia(data, 'media:thumbnail')
                ?? this.getUrlFromMedia(data, 'media:content');

            if (data.categories) {
                for (const c of data.categories) {
                    article.categories!.push({
                        name: c,
                        links: []
                    });
                }
            }

            if (source.options?.articles?.extract_attachments_from_content) {
                article.attachments!.push(...extractLinks(article.content));
            }

            // Assign remaining fields too extra
            Object.entries(data).forEach(extra => {
                if (RssParser.BASIC_DATA.includes(extra[0] as any) || !extra[1]) return;
                article.extra![extra[0]] = extra[1];
            });

            articles.push(article as Article);
        }

        return articles;
    }

    private getUrlFromMedia(data: any, key: string): string | null {
        return data[key]?.['$']?.['url'];
    }
}
