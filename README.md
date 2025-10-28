# Saffron | News &amp; announcements aggregation framework.

## Table of Contents

- [What is Saffron?](#what-is-saffron)
- [Installation](#installation)
- [Initialization](#initialization)
- [Configuration](#configuration)
- [Parsers](#parsers)
    - [WordPress V2](#wordpress-v2)
    - [RSS](#rss)
    - [HTML](#html)
    - [JSON / XML](#json--xml)
    - [Dynamic](#dynamic)
    - [Which to choose](#which-to-choose)
- [Article](#article)
- [Source files](#source-files)
    - [What is a source file?](#what-is-a-source-file)
    - [Creating a source file](#creating-a-source-file)
- [Extensions](#extensions)
    - [Register a middleware](#register-a-middleware)
    - [Format article](#format-article)
    - [Articles](#articles)
- [Standalone](#standalone)

## What is Saffron?

Saffron stands for **S**imple **A**bstract **F**ramework **F**or the **R**etrieval **O**f **N**ews.

As said, saffron is a framework. It is an abstraction engine that helps you collect news and
announcements from websites in a uniform way.

It supports different ways of data collection, such as API endpoints and web-scraping.
It tries to ease the process of integrating all data sources by abstracting data collection into a few simple
and powerful functions.

## Installation

To install the latest release:

```shell
npm install @jexsrs/saffron
```

To install a specific version:

```shell
npm install @jexsrs/saffron@version
```

## Initialization

Once you have installed the library:

```ts
import {initializeApp, getApp} from "@jexsrs/saffron";

const app = initializeApp();
app.start();
```

## Configuration

### `scheduler`

A function that will resolve the scheduler to be used.
The scheduler is responsible for tracking which source needs to be scraped and when.

Default value is `(app: Saffron) => new LinearScheduler(app)`.

To implement a custom scheduler, you can create a class that extends the `Scheduler` class.
```ts
import {Scheduler, initializeApp, getApp} from "@jexsrs/saffron";

class MyScheduler extends Scheduler {
  constructor(saffron: Saffron) {
      super(saffron);
  }

  // Return if the scheduler is running or not.
  get running(): boolean {
    return false;
  }

  // Starts the scheduler
  async start(reset: boolean): Promise<void> {
    this._running = true;
    // ...
    
    
    // When we need to call the scraping
    try {
      const result = await this.saffron.scrape(job.source);
      this.fire('success', job.source, result, null);
      
      // Reschedule source ...
    } catch (e) {
      this.fire('error', job.source, [], e);
      
      // Reschedule source ...
    }
  }

  // Stops the scheduler
  stop(): void {
    this._running = false;
    // ...
  }
}

const app = initializeApp({
  scheduler: (app: Saffron) => new MyScheduler(app)
});
app.start();
```

### `sources`

#### `ignore_certificates`

When `true`, the request will ignore all SSL certificates.

Default value is `false`.

#### `delay_between_requests`

The delay between requests on the same source in milliseconds.

Default value is `100`.

#### `axios`

The axios configuration to be used for the requests. Can be JSON or function `(source: Source<any>) => Promise<AxiosRequestConfig>`.`

#### `preprocessor`

A preprocessor function that will be called between the request and the article parsing.
Type is `(responses: any, source: Source<I>) => Promise<any>`.

#### `articles.amount`

The amount of articles to be retrieved from the source.

Default value is `30`.

#### `articles.extract_attachments_from_content`

When `true`, any attachments from the content of the article will be extracted.

Default value is `true`.

#### `on_request_fail`

When `fail`, the source will be skipped if the request of one of the URLs fails.
When `skip`, the source will continue to test the other URLs even if one of them fails.

Default value is `fail`.

#### `dynamic_sources`

An array of dynamic sources that will be used from the `dynamic` parser.

#### `encoding`

The encoding to be used for the requests. It will be passed in `new TextDecoder(encoding)`
and be applied to the response.

## Parsers

To retrieve the desired information from the websites we use parsers.
There are four available parser types: `wordpress`, `rss`, `html`, `xml`, `json` and `dynamic`.

### WordPress V2

Parser type: `wordpress-v2`

By default, [`WordPress`](https://wordpress.com/) based websites has an open API for news retrieval.
We make use of that to get access on the articles and categories of the website.

To quickly check if a website supports the WordPress API simply open your browser and
type `<website-root-link>/wp-json/wp/v2/posts/`.
If a valid JSON file is displayed on the browser (or downloaded on your computer) which contains the website's articles,
then you can safely use the `wordpress` parser.

### RSS

Parser type: `rss`

Many websites support [`RSS`](https://en.wikipedia.org/wiki/RSS) feed. RSS allows users and applications to access updates
to websites in a standardized, computer-readable format. You can check if a website supports RSS if you can see this
icon <img src="docs/rss.png" width="15" height="15" />.

### JSON / XML

Parser type: `json` (or `xml`)

This parser is best to be used when it comes to pages that are loading data using API requests (e.g. lazy loading).
The only prerequisite for this parser is that the response of the API requests is in a structured JSON or XML format.

### HTML

Parser type: `html`

This parser uses scrapping tools like [CheerioJS](https://cheerio.js.org/) to scrape the website content and receive
the displayed news. This parser is best to be used when the HTML in the website is structured. Websites where the HTML
and CSS are not structured will be very difficult to scrape.

### Dynamic

Parser type: `dynamic`

Unlike the other parsers, this parser uses typescript code to parse a website. The user 
decides all the logic for the scraping by extending the class `Parser<I>`.

```ts
import {Parser} from "@jexsrs/saffron";

type Instructions = {
    my_option: string;
}

export class Dynamic1 extends Parser<Instructions> {

  /**
   * The name of the dynamic parser. Must be unique
   */  
  get name(): string {
    return this.source.name;
  }

  /**
   * A function that will validate if the instruction field is correct.
   * It must throw an error if the data are incorrect.
   * @param data
   */
  public validate(data?: any): void {
    if(data.my_option && data.my_option !== 'hello') {
        throw new Error('invalid my_option');
    } 
  }

  /**
   * A function that will take the validated scrape configuration and return the parsed output.
   * Defaults to return the data as is.
   * @param data
   */
  public preprocess(data: any): Instructions {
    data.my_option ??= 'hello';
    return data;
  }

  /**
   * A function that will handle and asynchronous request to the source.
   * Defaults to a GET request.
   * @param source
   */
  public request(source: Source<I>): Promise<AxiosResponse> {
    return this.get(this.url);
  }

  /**
   * A function that will parse the result of the request.
   * @param source
   * @param result The result of the request.
   */
  async parse(source: Source<Instructions>, result: AxiosResponse): Promise<Article[]> {
    // Reuse the rss parser for this example
    const rss = new RssParser();
    rss.source = source;
    source.instructions = {
      extra_fields: [],
      assign_fields: {}
    };

    return rss.parse(source, result);
  }
}
```

### Which to choose

We recommend a specific order for using the available parsers.

* If the desired website is based an [`WordPress`](https://wordpress.com/) and the WordPress articles API is enabled, then choose the `wordpress-v2` parser.
* If the desired website supports [`RSS`](https://en.wikipedia.org/wiki/RSS) feed. then choose the `rss` parser.
* If the desired website is loading data using API requests with structured responses (e.g. lazy loading), then choose the `json` or `xml` parser.
* If the desired website has a structured form, the use the `html` parser.
* If none of the above is possible (bad html or custom API) then the `dynamic` parser is our last choice.

## Article

We have created a universal format for the parsed news, and we named it `Article`.

```ts
type Article = {
  title: string;
  content: string;
  url: string;
  publication_date: string;
  thumbnail_url: string;

  author_name: string;
  author_image_url: string;

  attachments: {
    attribute: string;
    value?: string;
    text?: string;
  }[];
  
  categories: {
    name: string;
    links: string[];
  }[];

  timestamp: number;
  extra: Record<string, any>;
  source: string;
};
```

## Source files

### What is a source file?

A source file is a `json` file that represents a website.
These files are generated from the user and guide Saffron on how to parse a website.

### Creating a source file

The source file type is as follows:
```ts
export type Source<I> = {
  // The unqiue name of the source.
  name: string;
  // The url(s) of the source.
  url: string | string[] | {url: string; categories: string[]}[];

  // The parser to be used.
  parser: 'rss' | 'json' | 'html' | 'dynamic' | 'wordpress-v2' | 'xml';
  // The custom instructions for the parser.
  instructions: I;

  // An object set by the user for the user, will not be used by Saffron.
  extra?: any;

  // Override Saffron's default options.
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
```

#### Wordpress Instructions

```ts
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
```

#### RSS Instructions

```ts
export type RssInstructions = {
  extra_fields: string[];
  assign_fields: {
    [assign: string]: string;
  };
}
```

#### JSON / XML Instructions

```ts
type JsonSkipOptions = {
  find?: (string | number)[];
  text?: string;
  type?: 'exact' | 'contains'; // Default is 'exact'
} | {
  position: number;
};

type Instructions = {
  container: (string | number)[];
  skip?: JsonSkipOptions[];
  article: {
    [field: string]: {
      parent?: string;
      find?: (string | number)[];
      static?: string;
    };
  };
  unpaired_tags?: string[];
}
```

#### HTML Instructions

```ts
type HtmlSkipOptions = {
  selector?: string;
  attribute?: string;
  text?: string;
  type?: 'exact' | 'contains'; // Default is 'exact'
} | {
  position: number;
};

type Instructions = {
  container: string;
  scripting_enabled?: boolean;
  skip?: HtmlSkipOptions[];
  article: {
    [field: string]: {
      parent?: string;

      class?: string;
      find?: string[];
      attributes?: string[];
      multiple?: boolean;

      static?: string;
    };
  };
}
```

#### Dynamic Instructions

```ts
type Instructions = {
  implementation?: string;
}
```

## Extensions

An extension is a function that gets executed before the articles are returned to the scheduler.
Extension functions can be useful for logging, article formatting or sorting.

The order where the extensions are executed is the order where they were registered.
Each extension event can be called more than once.

### Register a middleware

```typescript
app.use("name", (...args: any) => {
    //...
});
```

### Format article

For changing the contents of the articles.
It gets as parameter every article that was found from the parsers and must return the same object when it changed.

```javascript
app.use("article.format", (article: Article, source: Source<any>) => {
    // If possible set pubDate with milliseconds.
    let ms = new Date(article.pubDate).getTime();
    if (!isNaN(ms)) article.pubDate = ms;

    // Append source name before title for every article
    article.title = `[${article.getSource(saffron).name}] ${article.title}`;

    // Return the changed article.
    return article;
});
```

Note that any changes made on the source object will also affect the saved source.

### Articles

This extension can be used to edit the articles in bulk. You can sort or filter them as you want.
The only requirement is to return an array (empty or not) of articles.

```js
app.use("articles", (articles: Article[], source: Source<any>) => {
    sort(articles);
    return articles.filter((article) => article.title != null && article.title !== "");
});
```

## Standalone

Saffron supports immediate parsing using the static function `scrape`.

```ts
import {initializeApp} from "@unistudents/saffron";

const app = initializeApp();

try {
    const articles = app.scrape({
        name: "source-name",
        url: "https://example.com",
        parser: "html",
        // ...
        instructions: {
            // ...
        },
    }, null); // or pass a config

    console.log("Result:", articles);
} catch (e) {
    console.log("Encountered an error during parsing:", e);
}
```
