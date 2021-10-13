const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const {cryptoHash} = require('../util');   // gets the cryptoHash method for use at line 34.
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }

    addBlock({data}) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],
            data
        });

        this.chain.push(newBlock);
    }

    replaceChain(chain, validateTransactions, onSuccess) {
        if (chain.length <= this.chain.length) {
            console.error('The incoming chain must be longer.')
            return;
        }
        if(!Blockchain.isValidChain(chain)) {
            console.error('The incoming chain must be valid.')
            return;
        }

        if(!Blockchain.isValidChain(chain)) {
            console.error('The incoming chain must be valid.')
            return;
        }

        if(validateTransactions && !this.validTransactionData({ chain })) {
            console.error('The incoming chain has invalid data');
            return;
        }

        if (onSuccess) onSuccess(); // when replaceChain function is successfully completed.

        console.log('Replacing chain with', chain);
        this.chain = chain;
    }

    validTransactionData({ chain }) {
        for (let i = 1; i < chain.length; i++) {
            const block = chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;

            for(let transaction of block.data) {
                if(transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount += 1;

                    if(rewardTransactionCount > 1) {
                        console.error("Miner rewards exceeds limit.");
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error('Miner reward amount is invalid.');
                        return false;
                    }
                } else {
                    if(!Transaction.validTransaction(transaction)) {
                        console.error('Invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    if(transaction.input.amount !== trueBalance) {
                        console.error('Invalid input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)) {
                        console.error('An identical transaction appears more than one in the block');
                        return false;
                    } else {
                        transactionSet.add(transaction);
                    }
                }
            }
        }
        return true;
    }

    static isValidChain(chain) {
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {  // if the first block is not the genesis block
            return false;
        };
        // In the above line, the chain[0] and Block.genesis() are two different instances and hence cannot be triple equal, therefore we compared the contents.


        for(let i = 1; i < chain.length; i++) {  // skipping the i = 0 because the genesis block has already been compared.
            const {timestamp, lastHash, hash, nonce, difficulty, data} = chain[i];
            const actualLastHash = chain[i-1].hash;   // the actual last hash of the current block.
            // const {timestamp, lastHash, hash, data} = block;   // forming the block using all the parameters.
            const lastDifficulty = chain[i-1].difficulty;

            if (lastHash !== actualLastHash) return false;   // if the last hash is not equal to the calculated last hash.

            const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);  // the calculated current hash.

            if (hash !== validatedHash) return false;   // if the current hash is not equal to the calculated current hash.

            if(Math.abs(lastDifficulty - difficulty) > 1) return false;   // prevents difficulty jumps.
        }
        return true;
    }
}

module.exports = Blockchain;