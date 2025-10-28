import { expect } from "chai";
import { cleanupHTMLText } from "../src/utils/decode.js";
import { extractLinks } from "../src/utils/html.js";
describe('Other', function () {
    it('Extract links', function () {
        expect(extractLinks()).to.deep.equal([]);
        expect(extractLinks('')).to.deep.equal([]);
        const a = extractLinks(`<a href="url1">text1</a>`);
        expect(a.length).to.equal(1);
        expect(a[0].text).to.equal('text1');
        expect(a[0].value).to.equal('url1');
        expect(a[0].attribute).to.equal('href');
        const src = extractLinks(`<img src="url2"/>`);
        expect(src.length).to.equal(1);
        expect(src[0].text).to.be.undefined;
        expect(src[0].value).to.equal('url2');
        expect(src[0].attribute).to.equal('src');
        const link = extractLinks(`<link href="url3">`);
        expect(link.length).to.equal(1);
        expect(link[0].text).to.equal('');
        expect(link[0].value).to.equal('url3');
        expect(link[0].attribute).to.equal('href');
        const all = extractLinks(`<a href="url1">text1</a><img src="url2"/><link href="url3"><img src="url4"/>`);
        expect(all.length).to.equal(4);
        expect(all[0].text).to.equal('text1');
        expect(all[0].value).to.equal('url1');
        expect(all[0].attribute).to.equal('href');
        expect(all[1].text).to.be.undefined;
        expect(all[1].value).to.equal('url2');
        expect(all[1].attribute).to.equal('src');
        expect(all[2].text).to.be.undefined;
        expect(all[2].value).to.equal('url4');
        expect(all[2].attribute).to.equal('src');
        expect(all[3].text).to.equal('');
        expect(all[3].value).to.equal('url3');
        expect(all[3].attribute).to.equal('href');
    });
    it('HTML cleanup text', function () {
        expect(cleanupHTMLText('', false)).to.equal('');
        expect(cleanupHTMLText(`<a href="url1">text1</a>`, true)).to.equal('text1');
        expect(cleanupHTMLText(`<a href="url1">text1</a>`, false)).to.equal(`<a href="url1">text1</a>`);
        expect(cleanupHTMLText(`<p>My custom text 123</p>`, true)).to.equal('My custom text 123');
        expect(cleanupHTMLText(`<p>My custom text with <br /> text</p>`, true)).to.equal('My custom text with  text');
    });
});
//# sourceMappingURL=other.test.js.map