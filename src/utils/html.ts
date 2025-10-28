import {HtmlSkipOptions} from "../parsers/html.parser.js";
import {Attachment} from "../types/article.js";
import {cleanupHTMLText} from "./decode.js";
import * as cheerio from 'cheerio';

export function parseHTMLField(data: string | any[], excessive: boolean): string | undefined {
    let ret;
    if (Array.isArray(data) && data[0]?.value)
        ret = data[0].value;
    else if (typeof data === 'string')
        ret = data;
    return ret ? cleanupHTMLText(ret, excessive) : ret;
}

export function isSkippedHTMLNode(skip: HtmlSkipOptions[] | undefined, cheerioLoad: cheerio.CheerioAPI, element: cheerio.BasicAcceptedElems<any>, index: number): boolean {
    if (!skip) return false;

    const load = cheerioLoad(element);
    for (const s of skip) {
        if (_isSkippedHTMLNode(s, load, index))
            return true;
    }

    return false;
}

function _isSkippedHTMLNode(s: any, load: cheerio.Cheerio<any>, index: number): boolean {
    const {
        selector, attribute, text, type,
        position
    } = s;

    if (selector !== undefined) {
        const child = load.find(selector);
        if (child.html() == null) return false;

        if (text !== undefined) {
            let toCheck: string;
            if(attribute) {
                toCheck = child.attr(attribute) || '';
            } else {
                toCheck = child.text();
            }

            if (type === undefined || type === 'exact')
                return cleanupHTMLText(toCheck, false) === text;
            else if (type === 'contains')
                return toCheck.includes(text);
        }

        return true;
    } else if (text !== undefined) {
        // text exists and selector does not exist
        if (type === undefined || type === 'exact')
            return cleanupHTMLText(load.text(), false) === text;
        else if (type === 'contains')
            return load.text().includes(text);
    } else if (position !== undefined) {
        return index === position;
    }

    return false;
}

export function extractLinks(html?: string | null): Attachment[] {
    if (!html) return [];

    const $ = cheerio.load(html);
    const links: Attachment[] = [];

    $('a').each((index, element) => {
        links.push({
            text: $(element).text(), // get the text
            value: $(element).attr('href'), // get the href attribute
            attribute: 'href'
        });
    });

    $('img').each((index, element) => {
        links.push({
            text: $(element).attr('alt'), // get the alt
            value: $(element).attr('src'), // get the src attribute
            attribute: 'src'
        });
    });

    $('link').each((index, element) => {
        links.push({
            text: $(element).text(), // get the text
            value: $(element).attr('href'), // get the href attribute
            attribute: 'href'
        });
    });

    return links;
}
