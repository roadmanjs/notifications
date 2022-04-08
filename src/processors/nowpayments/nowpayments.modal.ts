import {Field, ObjectType} from 'couchset';

import {Transaction} from '../../transactions';

@ObjectType()
export class GetPaymentStatus {
    @Field(() => Number, {nullable: true})
    payment_id: number;
    @Field(() => String, {nullable: true})
    payment_status: string;
    @Field(() => String, {nullable: true})
    pay_address: string;
    @Field(() => Number, {nullable: true})
    price_amount: number;
    @Field(() => String, {nullable: true})
    price_currency: string;
    @Field(() => Number, {nullable: true})
    pay_amount: number;
    @Field(() => Number, {nullable: true})
    actually_paid: number;
    @Field(() => String, {nullable: true})
    pay_currency: string;
    @Field(() => String, {nullable: true})
    order_id: string;
    @Field(() => String, {nullable: true})
    order_description: string;
    @Field(() => Number, {nullable: true})
    purchase_id: number;
    @Field(() => String, {nullable: true})
    created_at: string;
    @Field(() => String, {nullable: true})
    updated_at: string;
    @Field(() => Number, {nullable: true})
    outcome_amount: number;
    @Field(() => String, {nullable: true})
    outcome_currency: string;
}

@ObjectType()
export class CreatePayment {
    @Field(() => Number, {nullable: true})
    payment_id: number;
    @Field(() => String, {nullable: true})
    payment_status: string;
    @Field(() => String, {nullable: true})
    pay_address: string;
    @Field(() => Number, {nullable: true})
    price_amount: number;
    @Field(() => String, {nullable: true})
    price_currency: string;
    @Field(() => Number, {nullable: true})
    pay_amount: number;
    @Field(() => String, {nullable: true})
    pay_currency: string;
    @Field(() => String, {nullable: true})
    order_id: string;
    @Field(() => String, {nullable: true})
    order_description: string;
    @Field(() => String, {nullable: true})
    ipn_callback_url: string;
    @Field(() => String, {nullable: true})
    created_at: string;
    @Field(() => String, {nullable: true})
    updated_at: string;
    @Field(() => Number, {nullable: true})
    purchase_id: number;
}

@ObjectType()
export class CreatePaymentResponse {
    @Field(() => CreatePayment, {nullable: false})
    payment: CreatePayment;

    @Field(() => Transaction, {nullable: false})
    transaction: Transaction;
}

@ObjectType()
export class GetPaymentStatusResponse {
    @Field(() => GetPaymentStatus, {nullable: false})
    payment: GetPaymentStatus;

    @Field(() => Transaction, {nullable: false})
    transaction: Transaction;
}
