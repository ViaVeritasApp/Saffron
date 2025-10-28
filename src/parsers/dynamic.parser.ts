import {Article} from "../types/article.js";
import {Parser} from "../types/parser.js";
import {Source} from "../types/source.js";

export type DynamicInstructions = {
    implementation?: string;
}

export class DynamicParser extends Parser<DynamicInstructions> {
    static id = 'dynamic';

    validate(s?: any): void {
        // This exists only for typescript, it is not valid and will not run at runtime.
        const scrape = s as DynamicInstructions;

        if (typeof scrape !== 'undefined' && (typeof scrape !== 'object' || Array.isArray(scrape)))
            throw new Error("must be a JSON object");

        if (typeof scrape?.implementation !== 'undefined' && (typeof scrape.implementation !== 'string' || scrape.implementation.length === 0))
            throw new Error(`implementation must be non empty string`);
    }

    preprocess(data: any): DynamicInstructions {
        return data || {};
    }

    request(source: Source<DynamicInstructions>): Promise<any> {
        this.dynamicSourceFile.source = source;
        this.dynamicSourceFile.url = this.url;

        return this.dynamicSourceFile.request(source);
    }

    parse(source: Source<DynamicInstructions>, result: any): Promise<Article[]> {
        this.dynamicSourceFile.source = source;
        this.dynamicSourceFile.url = this.url;

        return this.dynamicSourceFile.parse(source, result);
    }
}
