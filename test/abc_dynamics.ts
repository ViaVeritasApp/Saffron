import {Article, Parser, RssParser, Source} from "../src/index.js";

export class Dynamic1 extends Parser<any> {
    get name(): string {
        return "dynamic-1";
    }

    public validate(data?: any): void {

    }

    async parse(source: Source<any>, result: any): Promise<Article[]> {
        const rss = new RssParser();
        rss.source = source;

        source.instructions = {
            extra_fields: [],
            assign_fields: {}
        };

        return rss.parse(source, result);
    }
}

export class Dynamic2 extends Parser<any> {
    get name(): string {
        return "dynamic-2";
    }

    public validate(data?: any): void {

    }

    request(source: Source<any>): Promise<any> {
        throw new Error('Error1')
    }

    async parse(source: Source<any>, result: any): Promise<Article[]> {
        throw new Error('Error1')
    }
}
