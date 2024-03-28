import {REDIS_URL} from 'roadman';
import Redis from 'ioredis';

export interface PairRate {
    pair: string;
    rate: number;
}

export class RatesCache {
    redis: Redis;
    constructor() {
        this.redis = new Redis(REDIS_URL);
    }

    async getPair(pair) {
        return new Promise((resolve) => {
            this.redis.get(pair, (err, result) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve(JSON.parse(result));
                }
            });
        });
    }

    async savePair(pair, value: any) {
        return this.redis.set(pair, JSON.stringify(value));
    }
}
