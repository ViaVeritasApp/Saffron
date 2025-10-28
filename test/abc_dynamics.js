import { RssParser } from "../src/parsers/index.js";
import { Parser } from "../src/types/parser.js";
export class Dynamic1 extends Parser {
    get name() {
        return "dynamic-1";
    }
    validate(data) {
    }
    async parse(source, result) {
        const rss = new RssParser();
        rss.source = source;
        source.instructions = {
            extra_fields: [],
            assign_fields: {}
        };
        return rss.parse(source, result);
    }
}
export class Dynamic2 extends Parser {
    get name() {
        return "dynamic-2";
    }
    validate(data) {
    }
    request(source) {
        throw new Error('Error1');
    }
    async parse(source, result) {
        throw new Error('Error1');
    }
}
//# sourceMappingURL=abc_dynamics.js.map