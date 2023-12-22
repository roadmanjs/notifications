import {WalletAddress, WalletAddressModel, updateWallet} from '../../wallet';
import WithdrawRequestModel, {WithdrawRequestStatus} from '../../wallet/withdrawRequest.model';
import {add, isEmpty} from 'lodash';
import {awaitTo, log, verbose} from 'couchset/dist/utils';
import {moneroxUrl, moneroxWallet} from './monerox.config';
import {transactionExists, txDest} from '../btcpayserver';

import {addTxToXmrQueue} from './monerox.queue';
import axios from 'axios';

const moneroApi = axios.create({
    baseURL: moneroxUrl,
    headers: {'Content-Type': 'application/json'},
});

interface Res<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface SentMoneroxTx {
    isOutgoing: boolean;
    isConfirmed: boolean;
    numConfirmations: number;
    inTxPool: boolean;
    relay: boolean;
    isRelayed: boolean;
    isMinerTx: boolean;
    isFailed: boolean;
    isLocked: boolean;
    ringSize: number;
    outgoingTransfer: OutgoingTransfer;
    unlockTime: string;
    lastRelayedTimestamp: number;
    isDoubleSpendSeen: boolean;
    fee: string;
    inputs: Input[];
    fullHex: string;
    hash: string;
    key: string;
    metadata: string;
    weight: number;
}

export interface MoneroxTx {
    isConfirmed: boolean;
    inTxPool: boolean;
    isRelayed: boolean;
    relay: boolean;
    isFailed: boolean;
    isMinerTx: boolean;
    numConfirmations: number;
    isDoubleSpendSeen: boolean;
    fee: string;
    isLocked: boolean;
    hash: string;
    unlockTime: string;
    isIncoming: boolean;
    incomingTransfers: IncomingTransfer[];
    outgoingTransfer: OutgoingTransfer;
    isOutgoing: boolean;
}

export interface OutgoingTransfer {
    amount: string;
    destinations: Destination[];
    accountIndex: number;
    subaddressIndices: number[];
}

export interface Destination {
    address: string;
    amount: string;
}
export interface Input {
    keyImage: KeyImage;
}

export interface KeyImage {
    hex: string;
}

export interface IncomingTransfer {
    address: string;
    amount: string;
    accountIndex: number;
    subaddressIndex: number;
    numSuggestedConfirmations: number;
}

// getTx, sendTx, address

export const generateAddressXmr = async (): Promise<{address: string} | null> => {
    const endpoint = `/wallet/${moneroxWallet}/address`;

    try {
        const {data} = await moneroApi.post<Res<{address: string}>>(endpoint, {
            headers: {
                // Authorization: `token ${btcpayServerToken}`,
            },
        });

        if (!data || !data.success) {
            throw new Error(data.message);
        }

        return data.data;
    } catch (error) {
        console.error('Error generating address:', error);
        return null;
    }
};

export const createTransactionsXmr = async (destinations: txDest): Promise<any> => {
    try {
        const endpoint = `/wallet/${moneroxWallet}/send`;

        const {data} = await moneroApi.post<Res<SentMoneroxTx>>(endpoint, destinations, {
            headers: {
                // Authorization: `token ${btcpayServerToken}`,
            },
        });

        if (!data || !data.success) {
            throw new Error(data.message);
        }

        return data.data;
    } catch (error) {
        console.error('Error generating transactions:', error);
        return null;
    }
};

export const fetchTransactionsXmr = async () => {
    try {
        const endpoint = `/wallet/${moneroxWallet}/txs`;

        const {data} = await moneroApi.post<Res<MoneroxTx[]>>(endpoint, {
            headers: {
                // Authorization: `token ${btcpayServerToken}`,
            },
        });

        // if (!isEmpty(data)) {
        //     await btcPayServerProcessTransactions(data);
        // }

        if (!data || !data.success) {
            throw new Error(data.message);
        }

        // process transactions
        return data.data;
    } catch (error) {
        console.error('Error generating transactions:', error);
        return null;
    }
};

const localProcessedTransactions = [];

export const xmrProcessTransactions = async (transactions: MoneroxTx[]) => {
    try {
        // check if transaction exists in local queue
        const transactionsToProcess = transactions.filter(
            (transaction) => !localProcessedTransactions.includes(transaction.hash)
        );

        // then check if transaction exists in db
        // if it exists, then add it to local queue
        const transactionsToCheckAndProcess = await Promise.all(
            transactionsToProcess.map(async (transaction) => {
                if (await transactionExists(transaction.hash)) {
                    localProcessedTransactions.push(transaction.hash);
                    return {transaction, transactionId: transaction.hash, exists: true};
                }

                return {transaction, transactionId: transaction.hash, exists: false};
            })
        );

        // if not, then add to bull queue.
        const transactionsToPushToQueue = transactionsToCheckAndProcess.filter(
            (transaction) => !transaction.exists
        );
        transactionsToPushToQueue.forEach((transaction) => {
            addTxToXmrQueue(transaction.transaction);
        });
    } catch (error) {
        console.error('Error processing transactions:', error);
        return null;
    }
};

export const fulfillMonero = async (payment: MoneroxTx): Promise<void> => {
    verbose('Fulfilling monero', payment);

    const markAsProcessed = async (transactionHash: string) => {
        // push to local queue, as it has been processed, to avoid checking it again
        log('markAsProcessed ', transactionHash);
        localProcessedTransactions.push(transactionHash);
    };

    try {
        const {
            hash: transactionHash,
            isConfirmed,
            isIncoming,
            incomingTransfers,
            outgoingTransfer,
        } = payment;

        let txAmount = null;
        let confirmedTransaction = [];
        if (isIncoming) {
            confirmedTransaction = incomingTransfers.map((it) => ({
                address: it.address,
                amount: it.amount,
            }));

            txAmount = incomingTransfers.reduce((acc, it) => {
                return acc + +it.amount;
            }, 0);
        } else {
            txAmount = outgoingTransfer.amount;
            confirmedTransaction = outgoingTransfer.destinations.map((dest) => ({
                address: dest.address,
                amount: dest.amount,
            }));
        }

        if (!isConfirmed) {
            log('transaction not confirmed yet');
            return null;
        }

        const isWithdrawal = +txAmount < 0;

        log('isWithdrawal = ', isWithdrawal);

        if (isEmpty(txAmount)) {
            throw new Error('amount cannot be empty');
        }

        if (isEmpty(transactionHash)) {
            throw new Error('transactionHash cannot be empty');
        }

        // existing transaction, if not duplicate
        const [existingTransactionError, existingTransaction] = await awaitTo(
            transactionExists(transactionHash)
        );
        if (existingTransaction && !existingTransactionError) {
            throw new Error('transaction already exists = ' + transactionHash);
        }

        log('verifyTransaction confirmedTransaction = ', confirmedTransaction);

        await Promise.all(
            confirmedTransaction.map(async (tx) => {
                // const {address} = tx;
                const {address, amount: satoshiAmount} = tx;
                const satoshiToBtc = satoshiAmount / 100000000;

                if (isEmpty(address)) {
                    log('wallet address is empty ', {address, satoshiAmount, satoshiToBtc});
                    return Promise.resolve({data: 'address is empty'});
                }

                // WITHDRAWAL --------------------------------------------------------------------------------------------------------------------------------------------------------
                // WITHDRAWAL --------------------------------------------------------------------------------------------------------------------------------------------------------
                // WITHDRAWAL --------------------------------------------------------------------------------------------------------------------------------------------------------
                if (isWithdrawal) {
                    const withdrawRequests = await WithdrawRequestModel.pagination({
                        where: {
                            transactionHash,
                        },
                    });

                    if (!isEmpty(withdrawRequests)) {
                        const withdrawRequest = withdrawRequests.pop();

                        log('withdrawRequest = ' + withdrawRequest);

                        // update withdraw request
                        const updatedWithdraw = await WithdrawRequestModel.updateById(
                            withdrawRequest.id,
                            {
                                ...withdrawRequest,
                                status: WithdrawRequestStatus.completed,
                            }
                        );
                        log('withdrawRequest updated = ' + updatedWithdraw);
                        markAsProcessed(transactionHash);
                        return Promise.resolve({data: updatedWithdraw});
                    }
                    log('withdrawRequests not found');
                    markAsProcessed(transactionHash);
                    return Promise.resolve({data: 'withdrawal not supported yet'});
                }

                // FOR DEPOSIT --------------------------------------------------------------------------------------------------------------------------------------------------------
                // FOR DEPOSIT --------------------------------------------------------------------------------------------------------------------------------------------------------
                // FOR DEPOSIT --------------------------------------------------------------------------------------------------------------------------------------------------------
                // find wallet address
                const [errorAddress, addressWallet] = await awaitTo(
                    WalletAddressModel.findById(address)
                );

                if (isEmpty(addressWallet) || errorAddress) {
                    log('wallet address not found = ' + address);
                    markAsProcessed(transactionHash);
                    return Promise.resolve({data: 'wallet address not found = ' + address});
                }

                const owner = addressWallet.owner;
                log('updateWallet with', {
                    satoshiToBtc,
                    owner,
                    address,
                    addressWallet,
                    transactionHash,
                });

                // this creates a new transaction
                await updateWallet({
                    owner,
                    amount: +satoshiToBtc,
                    source: WalletAddress.name,
                    sourceId: address,
                    currency: addressWallet.currency,
                    transactionHash,
                });

                // update transactions count for wallet address
                await WalletAddressModel.updateById(address, {
                    ...addressWallet,
                    transactions: add(addressWallet.transactions || 0, 1),
                });

                // push to local queue, as it has been processed, to avoid checking it again
                return markAsProcessed(transactionHash);
            })
        );
    } catch (error) {
        log('Error fullfilling xmr transaction', error);
        return null;
    }
};
