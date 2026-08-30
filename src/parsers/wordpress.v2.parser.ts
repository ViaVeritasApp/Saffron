import type {AxiosResponse} from "axios";
import {Article} from "../types/article.js";
import {Parser} from "../types/parser.js";
import {Source} from "../types/source.js";
import {cleanupHTMLText} from "../utils/decode.js";
import {extractLinks} from "../utils/html.js";

type Instructions = {
    paths?: {
        posts?: string;
        categories?: string;
    };
    articles?: {
        include?: string[];
        dates?: {
            gmt?: boolean;
            fallback?: boolean;
        };
        filter?: {
            search?: string;
            author?: string;
            author_exclude?: string;
            after?: string;
            before?: string;
            slug?: string;
            status?: string;
            categories?: string;
            categories_exclude?: string;
            tags?: string;
            tags_exclude?: string;
            sticky?: boolean;
        };
        pagination?: {
            page?: number; // page
            size?: number; // per_page
        };
        thumbnail?: string;
        disable_thumbnail?: boolean;
    };
};

export class WordpressV2Parser extends Parser<Instructions> {
    static id = 'wordpress-v2';

    validate(s?: any): void {
        // This exists only for typescript, it is not valid and will not run at runtime.
        const scrape = s as Instructions;

        if (typeof scrape !== 'undefined') {
            if (typeof scrape !== 'object' || Array.isArray(scrape))
                throw new Error("must be a JSON object");

            if (typeof scrape.paths !== 'undefined') {
                if (typeof scrape.paths !== 'object' || Array.isArray(scrape.paths))
                    throw new Error("paths must be a JSON object");

                if (typeof scrape.paths.posts !== 'undefined' && typeof scrape.paths.posts !== 'string')
                    throw new Error(`articles.paths.posts must be a string`);

                if (typeof scrape.paths.categories !== 'undefined' && typeof scrape.paths.categories !== 'string')
                    throw new Error(`articles.paths.categories must be a string`);
            }

            if (typeof scrape.articles !== 'undefined') {
                if (typeof scrape.articles !== 'object' || Array.isArray(scrape.articles))
                    throw new Error("articles must be a JSON object");

                if (scrape.articles.include && !Array.isArray(scrape.articles.include))
                    throw new Error("articles.include must be an array of strings");

                if (typeof scrape.articles.dates !== 'undefined') {
                    if (typeof scrape.articles.dates !== 'object' || Array.isArray(scrape.articles.dates))
                        throw new Error("articles.dates must be a JSON object");

                    if (typeof scrape.articles.dates.gmt !== 'undefined' && typeof scrape.articles.dates.gmt !== 'boolean')
                        throw new Error("articles.dates.gmt must be a boolean");

                    if (typeof scrape.articles.dates.fallback !== 'undefined' && typeof scrape.articles.dates.fallback !== 'boolean')
                        throw new Error("articles.dates.fallback must be a boolean");
                }

                if (typeof scrape.articles.filter !== 'undefined') {
                    if (typeof scrape.articles.filter !== 'object' || Array.isArray(scrape.articles.filter))
                        throw new Error("articles.filter must be a JSON object");

                    for (const v of ['search', 'author', 'author_exclude', 'after', 'before', 'slug', 'status', 'categories', 'categories_exclude', 'tags', 'tags_exclude']) {
                        if ((scrape.articles.filter as any)[v] && typeof (scrape.articles.filter as any)[v] !== 'string')
                            throw new Error(`articles.filter.${v} must be a string`);
                    }

                    if (typeof scrape.articles.filter.sticky !== 'undefined' && typeof scrape.articles.filter.sticky !== 'boolean')
                        throw new Error("articles.filter.sticky must be a boolean");
                }

                if (scrape.articles.thumbnail && typeof scrape.articles.thumbnail !== 'string')
                    throw new Error("articles.thumbnail must be a string");

                if (typeof scrape.articles.disable_thumbnail !== 'undefined' && typeof scrape.articles.disable_thumbnail !== 'boolean')
                    throw new Error("articles.disableThumbnail must be a boolean");

                if (scrape.articles.disable_thumbnail && scrape.articles.thumbnail)
                    throw new Error("articles.thumbnail cannot be populated");
            }
        }
    }

    preprocess(data: Instructions): Instructions {
        data = data ?? {};

        data.paths ??= {};
        data.paths.posts ??= 'wp-json/wp/v2/posts';
        data.paths.categories ??= 'wp-json/wp/v2/categories';

        for (const v of ['posts', 'categories'] as const) {
            if (data.paths[v]?.startsWith('/'))
                data.paths[v] = data.paths[v].substring(1);
            if (data.paths[v]?.endsWith('/'))
                data.paths[v] = data.paths[v].substring(0, data.paths[v].length - 1);
        }

        data.articles ??= {};

        data.articles.include ??= [];

        data.articles.dates ??= {};
        data.articles.dates.gmt ??= false;
        data.articles.dates.fallback ??= false;

        data.articles.filter ??= {};
        data.articles.filter.search ??= undefined;
        data.articles.filter.author ??= undefined;
        data.articles.filter.author_exclude ??= undefined;

        // ISO8601 compliant date
        data.articles.filter.after ??= undefined;
        data.articles.filter.before ??= undefined;

        data.articles.filter.slug ??= undefined;
        // offset: typeof articleOptions.filter?.offset === 'number' ? articleOptions.filter.offset : 0,
        data.articles.filter.status ??= undefined;
        data.articles.filter.categories ??= undefined;
        data.articles.filter.categories_exclude ??= undefined;
        data.articles.filter.tags ??= undefined;
        data.articles.filter.tags_exclude ??= undefined;
        data.articles.filter.sticky ??= undefined;

        if (!data.articles.disable_thumbnail)
        data.articles.thumbnail ??= 'thumbnail';

        return data;
    }

    async request(source: Source<Instructions>): Promise<any> {
        let url = this.url;
        if (url.endsWith('/'))
            url = url.substring(0, url.length - 1);

        const instructions = source.instructions;

        const categoriesUrl = `${url}/${instructions.paths!.categories}`;
        let postsUrl = `${url}/${instructions.paths!.posts}?${instructions.articles?.disable_thumbnail ? '' : '_embed&'}per_page=${source.options?.articles?.amount}`;

        const filters = instructions.articles!.filter!;
        if (filters.search) postsUrl += `&search=${encodeURIComponent(filters.search)}`;
        if (filters.author) postsUrl += `&author=${filters.author}`;
        if (filters.author_exclude) postsUrl += `&author_exclude=${filters.author_exclude}`;
        if (filters.after) postsUrl += `&after=${filters.after}`;
        if (filters.before) postsUrl += `&before=${filters.before}`;
        // if(filters.offset != null && filters.offset > 0) postsUrl +=`&offset=${filters.offset}`;
        if (filters.slug) postsUrl += `&slug=${filters.slug}`;
        if (filters.status) postsUrl += `&status=${filters.status}`;
        if (filters.categories) postsUrl += `&categories=${filters.categories}`;
        if (filters.categories_exclude) postsUrl += `&categories_exclude=${filters.categories_exclude}`;
        if (filters.tags) postsUrl += `&tags=${filters.tags}`;
        if (filters.tags_exclude) postsUrl += `&tags_exclude=${filters.tags_exclude}`;
        if (filters.sticky) postsUrl += `&_sticky`;

        const catReq = await this.get(categoriesUrl);
        const postsReq = await this.get(postsUrl);

        return [catReq, postsReq];
    }

    async parse(source: Source<Instructions>, response: AxiosResponse[]): Promise<Article[]> {
        const [catReq, postsReq] = response;

        const instructions = source.instructions;

        const categories = JSON.parse(catReq.data);
        const posts = JSON.parse(postsReq.data);

        const articles: Article[] = [];

        const parsedCategories = Array.isArray(categories) ?
            categories.map((category: any) => {
                const links: string[] = [];

                const linkCatsKeys = Object.keys(category._links);

                for (const linkCat of linkCatsKeys) {
                    for (const href of category._links[linkCat])
                        links.push(href.href);
                }

                return {
                    id: category.id,
                    description: cleanupHTMLText(category.description, false),
                    name: cleanupHTMLText(category.name, true),
                    links
                };
            }) : [];

        let count = 0
        for (const p of posts) {
            // WordPress will return the specified amount, but we double-check to be sure
            if (count >= source.options?.articles?.amount!) continue;
            count++;

            const article = {
                categories: [],
                attachments: [],
                extra: {},
            } as Partial<Article>;

            article.title = cleanupHTMLText(p.title.rendered, true);
            article.content = cleanupHTMLText(p.content.rendered, false);
            article.url = cleanupHTMLText(p.link, false);

            if (instructions.articles!.dates!.gmt) {
                if (p.date_gmt != null) {
                    article.publication_date = p.date_gmt;
                } else if (instructions.articles!.dates!.fallback) {
                    article.publication_date = p.date;
                }
            } else {
                article.publication_date = p.date;
            }

            if (source.options?.articles?.extract_attachments_from_content) {
                article.attachments!.push(...extractLinks(article.content));
            }

            for (const cId of p.categories ?? []) {
                const cat = parsedCategories.find((c: any) => c.id == cId)
                if (cat) {
                    article.categories?.push({
                        name: cat.name,
                        links: cat.links
                    });
                }
            }

            // Thumbnail
            if (!instructions.articles!.disable_thumbnail) {
                const thumbnailSize = instructions.articles!.thumbnail!;
                article.thumbnail_url = p._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.[thumbnailSize]?.source_url;
            }

            let include: string[] = instructions.articles!.include!;
            // The date the object was last modified.
            if (include.includes('modified')) {
                if (instructions.articles!.dates!.gmt) {
                    if (p.modified_gmt != null) {
                        article.extra!.modified = p.modified_gmt;
                    } else if (instructions.articles!.dates!.fallback) {
                        article.extra!.modified = p.modified;
                    }
                } else {
                    article.extra!.modified = p.modified;
                }

                // Remove it
                include = include.filter(s => s !== 'modified');
            }

            // Can get anything from guid, type, slug to title content etc...
            for (const elem of include) {
                if (p[elem]?.rendered != null) {
                    article.extra![elem] = p[elem].rendered
                } else {
                    article.extra![elem] = p[elem]
                }
            }

            articles.push(article as Article);
        }

        return articles;
    }

}
