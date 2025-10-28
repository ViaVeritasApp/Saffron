import type {AxiosResponse} from "axios";
import {XMLParser as xmlParser} from "fast-xml-parser";
import {Article} from "../types/article.js";
import {Parser} from "../types/parser.js";
import {Source} from "../types/source.js";
import {parseField} from "../utils/common.js";
import {extractLinks} from "../utils/html.js";
import {getSafe, isSkippedJSONNode} from "../utils/json.js";
import {JsonSkipOptions} from "./JSON.parser.js";

type Instructions = {
    container: (string | number)[];
    skip?: JsonSkipOptions[];
    article: {
        [field: string]: {
            parent?: string;
            find?: (string | number)[];
            static?: string;
        };
    };
    unpaired_tags?: string[];
}

export class XMLParser extends Parser<Instructions> {
    static id = 'xml';

    validate(s?: any): void {
        // This exists only for typescript, it is not valid and will not run at runtime.
        const scrape = s as Instructions;

        if (typeof scrape !== 'object' || Array.isArray(scrape))
            throw new Error("must be a JSON object");

        if (scrape.container !== undefined && (!Array.isArray(scrape.container) || scrape.container.some(a => typeof a !== 'string' && typeof a !== 'number')))
            throw new Error(`container must be a string/number array`);

        if (typeof scrape.article !== 'object' || Array.isArray(scrape.article))
            throw new Error("article must be JSON object");

        if (scrape.skip !== undefined && !Array.isArray(scrape.skip))
            throw new Error("skip must be an array");
        for (const index in scrape.skip ?? []) {
            const item = scrape.skip![index];
            if (typeof item !== 'object')
                throw new Error(`skip.${index} must be an object`);
            const keys = Object.keys(item);
            const {
                find, text, type,
                position
            } = (<any>item);

            if (keys.includes('find') || keys.includes('text')) {
                if (keys.includes('position'))
                    throw new Error(`skip.${index}.position cannot be together with "selector" or "text"`);

                if (find !== undefined && (!Array.isArray(find) || find.some(a => typeof a !== 'string' && typeof a !== 'number')))
                    throw new Error(`skip.${index}.find must be a string/number array`);
                if (text !== undefined && typeof text !== 'string')
                    throw new Error(`skip.${index}.text must be a string`);

                if (keys.includes('type') && type !== 'exact' && type !== 'contains')
                    throw new Error(`skip.${index}.type must be a "exact" or "contains"`);
            } else if (keys.includes('position')) {
                if (typeof position !== 'number' || position < 0)
                    throw new Error(`skip.${index}.position must be a zero or positive number`);
            } else
                throw new Error(`skip.${index} contains illegal fields`);
        }

        const articleKeys = Object.keys(scrape.article);

        if ((new Set(articleKeys)).size !== articleKeys.length)
            throw new Error("article cannot have duplicates keys");

        for (const key of Object.keys(scrape.article)) {
            const options = scrape.article[key];

            if (typeof options.parent !== 'string' && options.parent !== undefined)
                throw new Error(`article.${key}.parent must be string`);

            if (options.find !== undefined && (!Array.isArray(options.find) || options.find.some(a => typeof a !== 'string' && typeof a !== 'number')))
                throw new Error(`article.${key}.find must be string/number array`);

            if (typeof options.static !== 'string' && options.static !== undefined)
                throw new Error(`article.${key}.static must be string`);

            // If static exists, then except parent all fields must not be defined
            if (options.static !== undefined) {
                if (options.find !== undefined)
                    throw new Error(`article.${key}: when the static key is defined the key find must not be defined`);
            }
            // At least one field must be mentioned
            else if (options.find === undefined)
                throw new Error(`article.${key} at least one option must be defined`);
        }

        if (typeof scrape.unpaired_tags !== 'undefined' && (!Array.isArray(scrape.unpaired_tags) || scrape.unpaired_tags.some(a => typeof a !== 'string')))
            throw new Error(`unpaired_tags must be a string array`);
    }

    async parse(source: Source<Instructions>, result: any): Promise<Article[]> {
        const instructions = source.instructions;
        const response = result as AxiosResponse;

        let data = new xmlParser({
            allowBooleanAttributes: true,
            attributeNamePrefix: '',
            cdataPropName: '__cdata',
            commentPropName: '__comment',
            textNodeName: '__text',
            ignoreAttributes: false,
            ignoreDeclaration: false,
            ignorePiTags: false,
            numberParseOptions: {
                leadingZeros: false,
                hex: false,
                eNotation: false,
            },
            preserveOrder: false,
            processEntities: true,
            removeNSPrefix: false,
            trimValues: true,
            unpairedTags: instructions.unpaired_tags ?? [] // Like <br>
        }).parse(response.data);

        let root = data;
        for (const key of instructions.container) {
            root = getSafe(root, key);
        }

        const articles: Article[] = [];
        for (const index in root) {
            if (articles.length >= source.options?.articles?.amount!) continue;

            const child = root[index];
            if (isSkippedJSONNode(instructions.skip!, child, index as any)) continue;

            const articleData: Record<string, any> = {};
            const options = instructions.article;

            // Get data for each option
            for (const key in options) {
                const opts = options[key];

                if (opts.static !== undefined) {
                    articleData[key] = opts.static;
                    continue;
                }

                let nested = root[index];
                for (const key of opts.find ?? []) {
                    nested = getSafe(nested, key);
                }

                articleData[key] = nested;
            }

            // Utility to merge fields with parent
            for (const item in options) {
                const parent = options[item].parent;
                if (!parent) continue;

                // Parent is string
                if (typeof articleData[parent] === 'string') {
                    // Parent (string) - Child (string)
                    if (typeof articleData[item] === 'string')
                        articleData[parent] += articleData[item];
                    // Parent (string) - Child (array)
                    else if (Array.isArray(articleData[item]))
                        articleData[parent] += articleData[item].reduce((acc, curr) => acc + curr.value, '');
                } else if (Array.isArray(articleData[parent])) {
                    // Parent (array) - Child (string)
                    if (typeof articleData[item] === 'string')
                        articleData[parent].push(...(articleData[item] ? [articleData[item]] : []));
                    // Parent (array) - Child (array)
                    else if (Array.isArray(articleData[item]))
                        articleData[parent].push(...(articleData[item] ? articleData[item] : []));
                }
            }

            const article = {
                categories: [],
                attachments: [],
                extra: {},
            } as Partial<Article>;

            article.title = parseField(articleData.title);
            article.content = parseField(articleData.content);
            article.url = parseField(articleData.url);
            article.publication_date = parseField(articleData.publication_date);
            article.thumbnail_url = parseField(articleData.thumbnail_url);

            article.author_name = parseField(articleData.author_name);
            article.author_image_url = parseField(articleData.author_image_url);

            if (articleData.categories) {
                if (Array.isArray(articleData.categories)) {
                    for (const c of articleData.categories) {
                        article.categories!.push({
                            name: c,
                            links: [this.url]
                        });
                    }
                } else {
                    article.categories!.push({
                        name: articleData.categories,
                        links: [this.url]
                    });
                }
            }
            for (const d of articleData.attachments ?? []) {
                article.attachments!.push(d);
            }

            if (source.options?.articles?.extract_attachments_from_content) {
                article.attachments!.push(...extractLinks(article.content));
            }

            // For each extra data. Data that are not described in the baseData variable.
            Object.entries(articleData).forEach(extra => {
                if (XMLParser.BASIC_DATA.includes(extra[0] as any) || !extra[1]) return;
                article.extra![extra[0]] = extra[1];
            });

            articles.push(article as Article);
        }

        return articles;
    }
}
