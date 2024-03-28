import "mocha";

import { expect } from "chai";
import { fetchRates } from "."

describe("Kraken Rates Processor", () => {
    it("should pass", async () => {
        // Test
        const rates = await fetchRates('BTC_USD,XMR_USD');
        console.log("rates", rates);
        // Assert
        expect(rates).to.be.an('array');
    });
});