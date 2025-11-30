import {Options, Saffron} from "./saffron.js";

const apps = new Map<string, Saffron>();

export function initializeApp(options: Options, name: string = 'default'): Saffron {
    apps.set(name, new Saffron(options));

    return apps.get(name)!;
}

export function getApp(name: string = 'default'): Saffron {
    if(apps.has(name)) return apps.get(name)!;
    throw new Error(`app '${name}' not found`);
}

export * from "./saffron.js";
export * from "./types/article.js";
export * from "./types/parser.js";
export * from "./types/scheduler.js";
export * from "./types/source.js";
export * from "./schedulers/index.js";
export * from "./parsers/index.js";

// TODO: Add mode debug - Will act as main, and will verbose a lot of data

// TODO: Add source file templates
//   A template folder, where a source file can extend to. Will contain the same fields
//   as a source file, but not all fields are required.
// TODO: Add debug mode, where file cache exists and if already fetched then do not repeat the request
// TODO: Enhance HTML scraper to mark find as directly below
