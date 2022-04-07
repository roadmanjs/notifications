import {Resolver, Query, Arg, UseMiddleware, Ctx} from 'couchset';
import {v4 as uuidv4} from 'uuid';
import _get from 'lodash/get';
import {log} from '@roadmanjs/logs';
import type {ICreateInvoice} from '@nowpaymentsio/nowpayments-api-js/src/types';
import {isAuth, ContextType} from '@roadmanjs/auth';
import {Transaction} from '../../transactions';
import {nowPaymentsCallbackUrl} from './config';
import {createNowPaymentInvoice} from './nowpayments.methods';

@Resolver()
export class NowPaymentsResolver {
    @Query(() => [Transaction])
    @UseMiddleware(isAuth)
    async nowPaymentsCreateInvoice(
        @Ctx() ctx: ContextType,
        @Arg('amount', () => Number, {nullable: false}) payAmount: number,
        @Arg('currency', () => String, {nullable: true}) priceCurrency: string,
        @Arg('order_description', () => String, {nullable: true}) orderDescription: string,
        @Arg('success_url', () => String, {nullable: true}) successUrl: string,
        @Arg('cancel_url', () => String, {nullable: true}) cancelUrl: string
    ): Promise<String> {
        const owner = _get(ctx, 'payload.userId', '');
        const price_currency = priceCurrency || 'usd';
        const order_id = `${owner}-${uuidv4()}`;
        const order_description = orderDescription || `${order_id}-Payment`;

        try {
            const createInvoice: ICreateInvoice = {
                price_amount: payAmount,
                price_currency,
                ipn_callback_url: nowPaymentsCallbackUrl,
                order_id,
                order_description,
                success_url: successUrl,
                cancel_url: cancelUrl,
            };

            const {invoice: nowPaymentInvoiceCreated} = await createNowPaymentInvoice(
                createInvoice,
                owner
            );

            return nowPaymentInvoiceCreated.invoice_url;
        } catch (error) {
            log('error creating nowpayment invoice', error);
            return null;
        }
    }

    // todo nowPaymentsCreatePayment
}

export default NowPaymentsResolver;