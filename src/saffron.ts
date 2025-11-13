import * as parsers from "./parsers/index.js";
import {DynamicInstructions} from "./parsers/index.js";
import {LinearScheduler} from "./schedulers/index.js";
import {Article} from "./types/article.js";
import {ExtensionPair, PairEvent} from "./types/extension.js";
import {Parser} from "./types/parser.js";
import {Scheduler} from "./types/scheduler.js";
import {Source} from "./types/source.js";
import {sleep} from "./utils/common.js";

export type Options = {
    scheduler?: (app: Saffron) => Scheduler;
    sources?: Source<any>['options'];
};

export class Saffron {
    private declare scheduler: Scheduler;
    private readonly extensions: ExtensionPair[] = [];

    constructor(
        private readonly options?: Options
    ) {
        // Default options
        this.options ??= {};
        this.options.sources ??= {};
        this.options.sources.ignore_certificates ??= false;
        this.options.sources.delay_between_requests ??= 100;
        this.options.sources.articles ??= {};
        this.options.sources.articles.amount ??= 30;
        this.options.sources.articles.extract_attachments_from_content ??= true;
        this.options.sources.on_request_fail ??= 'fail';
        this.options.sources.dynamic_sources ??= [];
        this.options.scheduler ??= app => new LinearScheduler(app);
    }

    /**
     * Start the scheduler.
     * @param reset
     */
    async start(reset: boolean = true) {
        if (!this.scheduler) {
            this.scheduler = this.options!.scheduler!(this);
        }

        await this.scheduler.start(reset);
    }

    /**
     * Stops the scheduler.
     */
    stop() {
        if (!this.scheduler) {
            this.scheduler = this.options!.scheduler!(this);
        }

        this.scheduler.stop();
    }

    /**
     * Register a callback to be called when the scheduler finishes a source scraping event.
     * @param event
     * @param callback
     */
    use(event: PairEvent, callback: (...args: any[]) => any): void {
        this.extensions.push({event, callback});
    }

    /**
     * Scrape a source.
     * @param source
     */
    public async scrape<I>(source: Source<I> | string) {
        if(typeof source === 'string') {
            source = JSON.parse(source) as Source<I>;
        }

        // Default from global options
        source.options ??= {};
        source.options.ignore_certificates ??= this.options!.sources?.ignore_certificates;
        source.options.delay_between_requests ??= this.options!.sources?.delay_between_requests;
        source.options.articles ??= {};
        source.options.articles.amount ??= this.options!.sources?.articles?.amount;
        source.options.articles.extract_attachments_from_content ??= this.options!.sources?.articles?.extract_attachments_from_content;
        source.options.on_request_fail ??= this.options!.sources?.on_request_fail;
        source.options.dynamic_sources ??= this.options!.sources?.dynamic_sources;
        source.options.encoding ??= this.options!.sources?.encoding;
        source.options.preprocessor ??= this.options!.sources?.preprocessor;

        // Parse source url
        const urls: { url: string; categories: string[] }[] = [];
        if (typeof source.url === 'string') {
            urls.push({url: source.url, categories: []});
        } else if (Array.isArray(source.url)) {
            for (const url of source.url) {
                if (typeof url === 'string') {
                    urls.push({url, categories: []});
                } else if (typeof url === 'object') {
                    urls.push({url: url.url, categories: url.categories});
                }
            }
        }

        const parser: Parser<any> = new (Object.entries(parsers).find(p => p[1].id === source.parser)![1])();

        // Run validation
        parser.validate(source.instructions);
        source.instructions = parser.preprocess(source.instructions);

        let result: Article[] = []
        let errors: any[] = [];

        for (let i = 0; i < urls.length; i++) {
            const pair = urls[i];
            parser.url = pair.url;
            parser.source = source;

            if (source.parser === 'dynamic') {
                const impName = (source.instructions as DynamicInstructions).implementation ?? source.name;
                const dsf = source.options.dynamic_sources?.find(dsf => dsf.name === impName);
                if (!dsf) {
                    throw new Error(`could not find any implementation with name ${impName}`);
                }

                parser.dynamicSourceFile = dsf;
            }

            // Delay between requests
            if (i !== 0 && source.options.delay_between_requests) {
                await sleep(source.options.delay_between_requests);
            }

            try {
                let response = await parser.request(source);
                response = source.options.preprocessor ? await source.options.preprocessor(response, source) : response;

                const articles = await parser.parse(source, response);
                for (const a of articles) {
                    a.source = source.name;
                    a.timestamp = Date.now();

                    if (pair.categories.length) {
                        a.extra ??= {};
                        a.extra.__categories = pair.categories.map(it => ({
                            name: it,
                            links: [pair.url]
                        }))
                    }
                }

                result.push(...articles);
            } catch (e) {
                errors.push(e);
                if (source.options.on_request_fail === 'fail') {
                    throw e;
                }
            }
        }

        // Handle extensions
        for (const ext of this.extensions) {
            if (ext.event === 'articles') {
                result = await ext.callback(result, source);
            } else if (ext.event === 'article.format') {
                for (const i in result) {
                    result[i] = await ext.callback(result[i], source);
                }
            }
        }

        return {
            articles: result,
            errors
        };
    }
}
