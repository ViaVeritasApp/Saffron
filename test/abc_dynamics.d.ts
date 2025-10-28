import { Article } from "../src/types/article.js";
import { Parser } from "../src/types/parser.js";
import { Source } from "../src/types/source.js";
export declare class Dynamic1 extends Parser<any> {
    get name(): string;
    validate(data?: any): void;
    parse(source: Source<any>, result: any): Promise<Article[]>;
}
export declare class Dynamic2 extends Parser<any> {
    get name(): string;
    validate(data?: any): void;
    request(source: Source<any>): Promise<any>;
    parse(source: Source<any>, result: any): Promise<Article[]>;
}
