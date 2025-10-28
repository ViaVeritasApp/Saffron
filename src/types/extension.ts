export type PairEvent = 'articles' | 'article.format'

export type ExtensionPair = {
    event: PairEvent;
    callback: (...args: any[]) => any;
};
