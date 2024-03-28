import {PairRate, RatesCache} from '../../shared';

// generateAddress
// [cron] getAllTransactions -> settle
import axios from 'axios';
import {isEmpty} from 'lodash';
import {verbose} from 'roadman';

interface PublicTickerResponse {
    error: any[];
    result: Result;
}

interface Result {
    [key: string]: Xxbtzusd;
}

interface Xxbtzusd {
    a: string[];
    b: string[];
    c: string[];
    v: string[];
    p: string[];
    t: number[];
    l: string[];
    h: string[];
    o: string;
}

export const fetchRates = async (pairs: string, cache = false): Promise<PairRate[]> => {
    try {
        if (cache) {
            const ratesCache = new RatesCache();
            const rates = await Promise.all(
                pairs.split(',').map((pair) => ratesCache.getPair(pair))
            );
            return rates as any;
        }

        const getRates = async (pairrr: string) => {
            const pairRate = pairrr.replaceAll('_', '');
            const endpoint = `https://api.kraken.com/0/public/Ticker?pair=${pairRate}`;

            try {
                const {data} = await axios.get<PublicTickerResponse>(endpoint);

                if (data?.error?.length) {
                    throw new Error(data?.error as any);
                }

                const resultsKeys = Object.keys(data?.result);
                const firstKey = resultsKeys[0];
                if (!firstKey) {
                    throw new Error('No data found');
                }

                const rateData = data.result[firstKey];
                if (!rateData) {
                    throw new Error('No data found');
                }

                if (!rateData.c || !rateData.c[0] || Number.isNaN(+rateData.c[0])) {
                    throw new Error('No data found');
                }

                return {
                    pair: pairrr,
                    rate: +rateData.c[0],
                };
            } catch (error) {
                return null;
            }
        };

        const rates = await Promise.all(pairs.split(',').map(getRates));

        return rates;
    } catch (error) {
        console.log('Error getting store rates:', error);
        return [];
    }
};

export const fetchRatesSaveToCache = async (pairs: string): Promise<any> => {
    try {
        const cache = new RatesCache();
        const rates = await fetchRates(pairs);
        if (!isEmpty(rates)) {
            const savedPairs = await rates.map(async (rate) => cache.savePair(rate.pair, rate));
            verbose('savedPairs', savedPairs.length);
        }
    } catch (error) {
        console.log('error fetchRatesSaveToCache', error);
        return null;
    }
};
