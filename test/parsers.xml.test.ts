import {expect} from "chai";
import {getApp} from "../src/index.js";
import fs from "node:fs";

describe("XML parser", function () {
    it('Test 1', function () {
        return getApp().scrape(JSON.parse(fs.readFileSync('./test/sources/xml/xml1.json', 'utf-8'))).then(articles => {
            expect(articles.length).to.equal(5);

            for (const article of articles) {
                expect(article.source).to.equal('xml1-source');
            }

            const article = articles[0];
            expect(article.title).to.equal('ΣΧΕΤΙΚΑ ΜΕ ΤΗΝ ΕΠΑΝΑΛΗΠΤΙΚΗ ΕΞΕΤΑΣΗ ΠΕΡΙΟΔΟΥ ΣΕΠΤΕΜΒΡΙΟΥ 2022');
            expect(article.content).to.equal('<p>ΣΤΑ ΕΓΓΡΑΦΑ ΑΝΑΡΤΗΘΗΚΑΝ ΤΑ ΘΕΜΑΤΑ ΤΗΣ ΕΞΕΤΑΣΗΣ-ΕΡΓΑΣΙΑΣ ΠΕΡΙΟΔΟΥ ΣΕΠΤΕΜΒΡΙΟΥ 2022. ΝΑ\n                ΤΑ ΕΧΕΤΕ ΤΥΠΩΜΕΝΑ ΜΑΖΙ ΣΑΣ ΔΙΟΤΙ ΔΕΝ ΘΑ ΔΙΑΝΕΜΗΘΟΥΝ ΦΩΤΟΤΥΠΙΕΣ. ΟΣΟΙ/ΕΣ ΧΡΕΙΑΖΟΝΤΑΙ ΒΕΒΑΙΩΣΗ ΣΥΜΜΕΤΟΧΗΣ\n                ΣΤΗΝ ΕΞΕΤΑΣΗ ΚΑΤΕΒΑΖΟΥΝ ΚΑΙ ΣΥΜΠΛΗΡΩΝΟΥΝ ΤΟ ΣΧΕΤΙΚΟ ΑΡΧΕΙΟ ΠΟΥ ΥΠΑΡΧΕΙ ΣΤΑ ΕΓΓΡΑΦΑ.</p>\n                <p>ΚΑΛΟ ΚΑΛΟΚΑΙΡΙ ΚΑΙ ΚΑΛΟ ΔΙΑΒΑΣΜΑ!</p>');
            expect(article.url).to.equal('https://eclass.uoa.gr/modules/announcements/index.php?an_id=416759&course=AEROSPACE119');
            expect(article.categories.length).to.equal(0);
            expect(article.publication_date).to.equal('Sun, 31 Jul 2022 23:59:39 +0300');
            expect(article.attachments.length).to.equal(0);
            expect(article.thumbnail_url).to.be.undefined;
            expect(article.extra.guid).to.equal('Sun, 31 Jul 2022 23:59:39 +0300416759');
            expect(article.extra['guid-permalink']).to.equal('false');
        });
    });
});
