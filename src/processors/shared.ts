import {REDIS_URL} from 'roadman';
import Redis from 'ioredis';

const ratesExpireMin = !Number.isNaN(+process.env.RATES_EXPIRE_MIN)
    ? +process.env.RATES_EXPIRE_MIN
    : 5;
export interface PairRate {
    pair: string;
    rate: number;
}

export class RatesCache {
    redis: Redis;
    constructor() {
        this.redis = new Redis(REDIS_URL);
    }

    async getPair(pair: string): Promise<PairRate> {
        return new Promise((resolve) => {
            this.redis.get(pair, (err, result) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve(JSON.parse(result) as PairRate);
                }
            });
        });
    }

    async savePair(pair: string, value: PairRate): Promise<boolean> {
        try {
            if (!value || !value.pair || !value.rate) {
                return false;
            }
            await this.redis.set(pair, JSON.stringify(value), 'EX', 60 * ratesExpireMin);
            return true;
        } catch (error) {
            return false;
        }
    }
}
