export type Attachment = {
    attribute: string;
    value?: string;
    text?: string;
};

export type Category = {
    name: string;
    links: string[];
};

export type Article = {
    title: string;
    content: string;
    url: string;
    publication_date: string;
    thumbnail_url: string;

    author_name: string;
    author_image_url: string;

    attachments: Attachment[];
    categories: Category[];

    timestamp: number;
    extra: Record<string, any>;
    source: string;
};
