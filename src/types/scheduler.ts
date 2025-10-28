import {Saffron} from "../saffron.js";
import {Source} from "./source.js";

export abstract class Scheduler {

    protected listeners: {event: string; callback: Function}[] = [];

    protected constructor(
        protected readonly saffron: Saffron
    ) {
    }

    /**
     * Return the state of the scheduler. If it is running or not.
     */
    abstract get running(): boolean;

    /**
     * Start the scheduler.
     * @param reset If set to true, it will delete the previous session and start a new one.
     */
    abstract start(reset: boolean): Promise<void>;

    /**
     * Stops the scheduler.
     */
    abstract stop(): void;

    /**
     * Register a callback to be called when the scheduler finishes a source scraping event.
     * @param event
     * @param callback
     */
    on(event: 'success' | 'error', callback: (source: Source<any>, articles: any[], error: any) => void): void {
        this.listeners.push({event, callback});
    }

    /**
     * Remove a listener from the scheduler.
     */
    removeAllListeners() {
        this.listeners = [];
    }

    protected fire(event: 'success' | 'error', source: Source<any>, articles: any[], error: any) {
        for(const listener of this.listeners) {
            if(listener.event === event) {
                listener.callback(source, articles, error);
            }
        }
    }
}
