import { getApp, initializeApp } from "../src/index.js";
import { expect } from "chai";
import { Dynamic1 } from "./abc_dynamics.js";
initializeApp({ mode: 'main' });
describe("Dynamic parser", function () {
    it('Test 1', function () {
        return getApp().scrape({
            url: 'http://127.0.0.1:3000/rss1',
            name: 'dynamic1-source',
            parser: 'dynamic',
            options: {
                dynamic_sources: [new Dynamic1()],
                ignore_certificates: true
            },
            instructions: {
                implementation: 'dynamic-1'
            }
        }).then(articles => {
            expect(articles.length).to.equal(7);
            for (const article of articles) {
                expect(article.source).to.equal('dynamic1-source');
            }
            const article = articles[0];
            expect(article.title).to.equal('ΣΧΕΤΙΚΑ ΜΕ ΤΗΝ ΕΠΑΝΑΛΗΠΤΙΚΗ ΕΞΕΤΑΣΗ ΠΕΡΙΟΔΟΥ ΣΕΠΤΕΜΒΡΙΟΥ 2022');
            expect(article.content).to.equal("<p>ΣΤΑ ΕΓΓΡΑΦΑ ΑΝΑΡΤΗΘΗΚΑΝ ΤΑ ΘΕΜΑΤΑ ΤΗΣ ΕΞΕΤΑΣΗΣ-ΕΡΓΑΣΙΑΣ ΠΕΡΙΟΔΟΥ ΣΕΠΤΕΜΒΡΙΟΥ 2022. ΝΑ\n ΤΑ ΕΧΕΤΕ ΤΥΠΩΜΕΝΑ ΜΑΖΙ ΣΑΣ ΔΙΟΤΙ ΔΕΝ ΘΑ ΔΙΑΝΕΜΗΘΟΥΝ ΦΩΤΟΤΥΠΙΕΣ. ΟΣΟΙ/ΕΣ ΧΡΕΙΑΖΟΝΤΑΙ ΒΕΒΑΙΩΣΗ ΣΥΜΜΕΤΟΧΗΣ\n ΣΤΗΝ ΕΞΕΤΑΣΗ ΚΑΤΕΒΑΖΟΥΝ ΚΑΙ ΣΥΜΠΛΗΡΩΝΟΥΝ ΤΟ ΣΧΕΤΙΚΟ ΑΡΧΕΙΟ ΠΟΥ ΥΠΑΡΧΕΙ ΣΤΑ ΕΓΓΡΑΦΑ.</p>\n <p>ΚΑΛΟ ΚΑΛΟΚΑΙΡΙ ΚΑΙ ΚΑΛΟ ΔΙΑΒΑΣΜΑ!</p>");
            expect(article.url).to.equal('https://eclass.uoa.gr/modules/announcements/index.php?an_id=416759&course=AEROSPACE119');
            expect(article.publication_date).to.equal('Sun, 31 Jul 2022 23:59:39 +0300');
            expect(article.categories.length).to.equal(0);
            expect(article.attachments.length).to.equal(0);
            expect(article.thumbnail_url).to.be.undefined;
        });
    });
});
//# sourceMappingURL=parsers.dynamic.test.js.map