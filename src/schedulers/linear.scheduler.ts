import fs from "fs";
import path from "node:path";
import {Saffron} from "../saffron.js";
import {Scheduler} from "../types/scheduler.js";
import {Source} from "../types/source.js";
import {glob} from "glob";

type Options = {
    /**
     * The path where the sources are located.
     * Defaults to './sources'
     */
    path?: string;
    /**
     * If set to true, it will scan all the subfolders of the path.
     * Defaults to true
     */
    scan_sub_folders?: boolean;
    /**
     * A function that will load the source from the filepath.
     * Defaults to (filepath: string) => JSON.parse(fs.readFileSync(filepath, 'utf-8'))
     * @param filepath
     */
    loader?: (filepath: string) => Promise<any>;
    /**
     * A list of sources to include. If set, it will only include the sources that are in this list.
     * Defaults to []
     */
    include_only?: string[];
    /**
     * A list of sources to exclude. If set, it will exclude the sources that are in this list.
     * Defaults to []
     */
    exclude?: string[];
    /**
     * The interval between each source scraping.
     * Defaults to 3600000 (1 hour)
     */
    interval?: number;
    /**
     * A function that will return a random number and will append it to the interval.
     * Defaults to () => { const high = 300; const low = 0; return Math.floor(Math.random() * (high - low) + low) * 1000; }
     */
    randomizeInterval?: () => number;
};

type Job = {
    source: Source<any>;
    remaining_time: number;
    status: 'pending' | 'running';
}

/**
 * A scheduler that will run all the sources in a linear fashion.
 * It will run each source every `interval` milliseconds.
 */
export class LinearScheduler extends Scheduler {
    private readonly checkInterval = 1000;

    declare interval: NodeJS.Timeout
    private sources: Source<any>[] = [];
    private jobs: Job[] = [];

    constructor(
        saffron: Saffron,
        private readonly options?: Options,
    ) {
        super(saffron);

        this.options ??= {};
        this.options.path ??= './sources';
        this.options.path = path.join(process.cwd(), this.options.path);

        this.options.scan_sub_folders ??= true;
        this.options.loader ??= (filepath: string) => JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        this.options.include_only ??= [];
        this.options.exclude ??= [];

        this.options.interval ??= 3600000;
        this.options.randomizeInterval ??= () => {
            const high = 300;
            const low = 0;

            const random = Math.floor(Math.random() * (high - low) + low) * 1000;
            return Math.random() >= 0.5 ? random : -random;
        };
    }

    private declare _running: boolean;

    get running(): boolean {
        return this._running;
    }

    async start(reset: boolean): Promise<void> {
        this._running = true;

        if (reset) {
            await this.initSources();
            await this.initJobs();
        }

        let checking = false;
        this.interval = setInterval(async () => {
            if(!this.running) return;
            if(checking) return;
            checking = true;

            for(const job of this.jobs) {
                // Subtract the elapsed time
                job.remaining_time -= this.checkInterval;

                if(job.remaining_time <= 0 && job.status === 'pending') {
                    job.status = 'running';

                    this.saffron.scrape(job.source)
                        .then(result => {
                            if(result.articles) {
                                this.fire('success', job.source, result.articles, null);
                            }

                            if(result.errors.length) {
                                this.fire('error', job.source, [], result.errors);
                            }

                            // Reset remaining time
                            job.remaining_time = this.options!.interval!;
                            job.status = 'pending';
                        })
                        .catch(e => {
                            this.fire('error', job.source, [], e);

                            // Rerun in half the time
                            job.remaining_time = this.options!.interval! / 2;
                            job.status = 'pending';
                        });
                }
            }

            checking = false;
        }, this.checkInterval);
    }

    stop(): void {
        this._running = false;
        clearInterval(this.interval);
    }

    private async initSources() {
        this.sources = [];

        let _path = this.options!.scan_sub_folders ? `${this.options!.path}/**` : this.options!.path!;

        const files: string[] = await glob(_path);
        if(!files || !files.length) {
            return;
        }

        const acceptedFiles = new RegExp(/.+\.json/);
        const rawSources = files.filter((file: any) => acceptedFiles.test(file))
        if (rawSources.length == 0) {
            return;
        }

        let sources: Source<any>[] = [];
        for(const rs of rawSources) {
            const source = await this.options!.loader!(rs);
            sources.push(source);
        }

        if(this.options!.include_only!.length) {
            const tmpSources: Source<any>[] = [];
            for (const source of sources) {
                if (this.options!.include_only!.includes(source.name))
                    tmpSources.push(source);
            }
            sources = tmpSources;
        }

        if(this.options!.exclude!.length) {
            for (const ex_source of this.options!.exclude!) {
                const index = sources.findIndex((source: Source<any>) => source.name === ex_source);
                if (index !== -1) {
                    sources.splice(index, 1);
                }
            }
        }

        this.sources = sources;
    }

    private async initJobs() {
        this.jobs = [];
        if (!this.sources.length) return;

        const separationInterval = this.options!.interval! / this.sources.length;

        let sI = 0;
        for (const source of this.sources) {
            this.jobs.push({
                source,
                remaining_time: separationInterval * sI++,
                status: 'pending'
            });
        }
    }
}
