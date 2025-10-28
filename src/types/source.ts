import {AxiosRequestConfig} from "axios";
import {Parser} from "./parser.js";

export type Source<I> = {
    name: string;
    url: string | string[] | {url: string; categories: string[]}[];

    parser: 'rss' | 'json' | 'html' | 'dynamic' | 'wordpress-v2' | 'xml';
    instructions: I;

    extra?: any;

    options?: {
        ignore_certificates?: boolean;
        delay_between_requests?: number;
        axios?: AxiosRequestConfig | ((source: Source<I>) => Promise<AxiosRequestConfig>);
        preprocessor?: (responses: any, source: Source<I>) => Promise<any>;
        articles?: {
            amount?: number;
            extract_attachments_from_content?: boolean;
        };
        on_request_fail?: 'fail' | 'skip';
        dynamic_sources?: Parser<any>[];

        encoding?: string;
    };
};
