const Transaction = require('../wallet/transaction');

class TransactionMiner {
    constructor({blockchain, transactionPool, wallet, pubsub}) { // pubfub for broadcast.
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }
    mineTransactions() {
        const validTransactions = this.transactionPool.validTransactions(); // finding valid transactions.

        validTransactions.push(  // generating the miner's reward.
            Transaction.rewardTransaction({minerWallet: this.wallet})
        );

        this.blockchain.addBlock({data: validTransactions}); // add a block consisting of these transactions to the blockchain.

        this.pubsub.broadcastChain(); // broadcasting the chain.

        this.transactionPool.clear(); // clearing the transaction pool.
    }
}

module.exports = TransactionMiner;
