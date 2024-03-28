import {TransactionAdminResolver, TransactionResolver} from './transactions';

import WalletRatesResolver from './wallet/wallet.rates.resolver';
// export applyProcessor
//  ---> roadman.app(applyProcessor)
// export resolvers
import {WalletResolver} from './wallet';

export const getWalletResolvers = () => [
    TransactionResolver,
    TransactionAdminResolver,
    WalletResolver,
    WalletRatesResolver,
];

export * from './wallet';
export * from './transactions';
export * from './processors';
