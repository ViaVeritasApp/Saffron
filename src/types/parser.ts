import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import https from "https";
import {deepmerge} from "../utils/json.js";
import {Article} from "./article.js";
import {Source} from "./source.js";

export abstract class Parser<I> {
    // Exp. If you remove the title, then the title is going to be on the extra information of each article.
    protected static readonly BASIC_DATA: (keyof Article)[] = [
        "title",
        "content",
        "url",
        "publication_date",
        "attachments",
        "categories",
        "thumbnail_url",
        "author_name",
        "author_image_url"
    ];

    public url!: string;
    public dynamicSourceFile!: Parser<I>;
    public source!: Source<I>;

    /**
     * The name of the dynamic parser. Must be unique
     */
    public get name(): string {
        return this.source.name;
    }

    /**
     * A function that will validate if the instruction field is correct.
     * It must throw an error if the data are incorrect.
     * @param data
     */
    public abstract validate(data?: any): void;

    /**
     * A function that will take the validated scrape configuration and return the parsed output.
     * Defaults to return the data as is.
     * @param data
     */
    public preprocess(data: any): I {
        return data;
    }

    /**
     * A function that will handle and asynchronous request to the source.
     * Defaults to a GET request.
     * @param source
     */
    public request(source: Source<I>): Promise<any> {
        return this.get(this.url);
    }

    /**
     * A function that will parse the result of the request.
     * @param source
     * @param result The result of the request.
     */
    abstract parse(source: Source<I>, result: any): Promise<Article[]>;

    async _request(options: AxiosRequestConfig): Promise<AxiosResponse> {
        if (this.source.options?.ignore_certificates)
            options.httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });

        let axiosConfig = this.source.options?.axios;
        if(axiosConfig) {
            if(typeof axiosConfig === 'function') {
                axiosConfig = await axiosConfig(this.source);
            }

            options = deepmerge(options, axiosConfig);
        }

        options.responseType = 'arraybuffer';
        options.responseEncoding = 'binary';

        const response = await axios.request(options);

        const decoder = this.source.options?.encoding ? new TextDecoder(this.source.options?.encoding) : new TextDecoder()
        response.data = decoder.decode(response.data);
        return response;
    }

    get(url: string, options?: AxiosRequestConfig): Promise<AxiosResponse> {
        if (options === undefined) options = {};
        options!.url = url;
        options!.method = "GET";
        return this._request(options!);
    }

    post(url: string, data: any, options?: AxiosRequestConfig): Promise<AxiosResponse> {
        if (options === undefined) options = {};
        options!.url = url;
        options!.method = "POST";
        options!.data = data;
        return this._request(options!);
    }
}
