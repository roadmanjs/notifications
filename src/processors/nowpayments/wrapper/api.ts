import type {ICreateInvoice, ICreatePayment} from '@nowpaymentsio/nowpayments-api-js/src/types';
import axios, {AxiosInstance} from 'axios';

import type {CreatePaymentReturn} from '@nowpaymentsio/nowpayments-api-js/src/actions/create-payment';
import type {InvoiceReturn} from '@nowpaymentsio/nowpayments-api-js/src/actions/create-invoice';

class NowApi {
    apiKey: string;
    api: AxiosInstance;

    constructor({apiKey, sandbox}: {apiKey: string; sandbox?: boolean}) {
        this.apiKey = apiKey;
        this.api = axios.create({
            baseURL: sandbox
                ? 'https://api-sandbox.nowpayments.io/v1/'
                : 'https://api.nowpayments.io/v1/',
            timeout: 10000,
            headers: {'x-api-key': apiKey},
            validateStatus: () => true,
        });
    }

    async createPayment(args: ICreatePayment): Promise<CreatePaymentReturn> {
        const {data} = await this.api.post('/payment', args);
        return data;
    }

    async createInvoice(args: ICreateInvoice): Promise<InvoiceReturn> {
        const {data} = await this.api.post('/invoice', args);
        return data;
    }
}

export default NowApi;
