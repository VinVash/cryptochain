const Transaction = require('./transaction');

class TransactionPool {
    constructor() {
        this.transactionMap = {};
    }

    clear() {
        this.transactionMap = {};
    }

    setTransaction(transaction) {
        this.transactionMap[transaction.id] = transaction; // setting the transaction. It can also handle transaction updates because it uses the same transaction id.
    }

    setMap(transactionMap) {
        this.transactionMap = transactionMap;
    }

    existingTransaction({inputAddress}) {
        const transactions = Object.values(this.transactionMap);

        return transactions.find(transaction => transaction.input.address === inputAddress); // if the transaction's input address matches the given input address to the function.
    }

    validTransactions() {
        return Object.values(this.transactionMap).filter(
            transaction => Transaction.validTransaction(transaction)
        );
    }

    clearBlockchainTransactions({chain}) {
        for (let i = 1; i < chain.length; i++) {
            const block = chain[i];

            for (let transaction of block.data) { // we go through every transaction of the block's data. If the transaction Map has that id, then we are going to delete it.
                if (this.transactionMap[transaction.id]) {
                    delete this.transactionMap[transaction.id];
                }
            }
        }
    }
}

module.exports = TransactionPool;
