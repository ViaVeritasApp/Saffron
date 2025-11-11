import express from "express";
import * as path from "node:path";

const app = express();

app.get('/wp1/wp-json/wp/v2/categories/', function (req, res) {
    res.status(200).sendFile('./webfiles/wp1-categories.json', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/wp1/wp-json/wp/v2/posts', function (req, res) {
    res.status(200).sendFile('./webfiles/wp1-posts.json', {
        root: path.join(process.cwd(), 'test')
    });
});

app.get('/wp2/wp-json/wp/v2/categories/', function (req, res) {
    res.status(200).sendFile('./webfiles/wp2-categories.json', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/wp2/wp-json/wp/v2/articles', function (req, res) {
    res.status(200).sendFile('./webfiles/wp2-posts.json', {
        root: path.join(process.cwd(), 'test')
    });
});

app.get('/rss1', function (req, res) {
    res.status(200).sendFile('./webfiles/rss1.xml', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/rss2', function (req, res) {
    res.status(200).sendFile('./webfiles/rss2.xml', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/rss3', function (req, res) {
    res.status(200).sendFile('./webfiles/rss3.xml', {
        root: path.join(process.cwd(), 'test')
    });
});

app.get('/html1', function (req, res) {
    res.status(200).sendFile('./webfiles/html1.html', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/html2', function (req, res) {
    res.status(200).sendFile('./webfiles/html2.html', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/html3', function (req, res) {
    res.status(200).sendFile('./webfiles/html3.html', {
        root: path.join(process.cwd(), 'test')
    });
});
app.get('/html4', function (req, res) {
    res.status(200).sendFile('./webfiles/html4.html', {
        root: path.join(process.cwd(), 'test')
    });
});

app.listen(3123, () => {
    console.log('Web server started at port 3123');
});

process.on('unhandledRejection', function onUncaught(err) {
    console.log(err);
    process.exit(1);
});
