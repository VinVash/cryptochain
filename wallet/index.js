const Transaction = require('./transaction');
const {STARTING_BALANCE} = require('../config');
const {ec, cryptoHash} = require('../util');

class Wallet {
    constructor() {
        this.balance = STARTING_BALANCE; // giving each wallet a starting balance.
        // The above statement was not working correctly if we replaced 1000 by STARTING_BALANCE, though both mean the same thing.
        // It was not working properly because the variable STARTING_BALANCE was not wrapped in curly braces.

        this.keyPair = ec.genKeyPair(); // private and public keys.

        this.publicKey = this.keyPair.getPublic().encode('hex');
    }

    sign(data) {
        return this.keyPair.sign(cryptoHash(data)); // works optimally when the data is in the form of a cryptographic hash.
    }

    createTransaction({recipient, amount, chain}) {
        if (chain) {
            this.balance = Wallet.calculateBalance({
                chain,
                address: this.publicKey
            });
        }

        if(amount > this.balance) {
            throw new Error('Amount exceeds balance');
        }
        return new Transaction({senderWallet: this, recipient, amount});
    }

    static calculateBalance({chain, address}) {
        let hasConductedTransaction = false;
        let outputsTotal = 0;

        for (let i = chain.length - 1; i > 0; i--) {
            const block = chain[i];

            for (let transaction of block.data) {
                if (transaction.input.address === address) {
                    hasConductedTransaction = true;
                }

                const addressOutput = transaction.outputMap[address];

                 if (addressOutput) {
                     outputsTotal = outputsTotal + addressOutput;
                 }
            }

            if(hasConductedTransaction) {
                break;
            }
        }

        return hasConductedTransaction ? 
            outputsTotal :
            STARTING_BALANCE + outputsTotal;
    }
};

module.exports = Wallet;
