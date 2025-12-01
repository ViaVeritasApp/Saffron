import {Saffron} from "../saffron.js";
import {Scheduler} from "../types/scheduler.js";
import {Source} from "../types/source.js";

type Options = {
    /**
     * A function that will return a list of sources to scrape.
     * @param reset
     */
    request: (reset: boolean) => Promise<{ items: Source<any>[] }>;
    /**
     * The interval between each source scraping.
     * Defaults to 30 minutes (1000 * 60 * 30)
     */
    request_interval?: number;
    /**
     * If set to true, it will wait until the request function finishes before starting the next one.
     * Defaults to true
     */
    wait_to_finish?: boolean;
};

/**
 * A scheduler that will run all the sources based on a request function.
 * It will run the request function every `request_interval` milliseconds.
 */
export class ExternalScheduler extends Scheduler {
    declare interval: NodeJS.Timeout

    constructor(
        saffron: Saffron,
        private readonly options: Options,
    ) {
        super(saffron);

        this.options.request_interval ??= 1000 * 30;
        this.options.wait_to_finish ??= true;
    }

    private declare _running: boolean;

    get running(): boolean {
        return this._running;
    }

    async start(reset: boolean): Promise<void> {
        let _reset = reset;

        this._running = true;

        let checking = false;
        this.interval = setInterval(async () => {
            if (!this.running) return;

            if (checking && this.options.wait_to_finish) return;
            checking = true;

            const result = await this.options.request(_reset)
                .catch(e => {
                    console.log(e);
                    return {items: []}
                });
            if (_reset) _reset = false;

            for (const source of result.items) {
                this.saffron.scrape(source)
                    .then(result => {
                        if (result.articles) {
                            this.fire('success', source, result.articles, null);
                        }

                        if (result.errors.length) {
                            this.fire('error', source, [], result.errors);
                        }
                    })
                    .catch(e => {
                        this.fire('error', source, [], e);
                    });
            }

            checking = false;
        }, this.options.request_interval);
    }

    stop(): void {
        this._running = false;
        clearInterval(this.interval);
    }
}
