const Blockchain = require('./index');
const Block = require('./block');
const {cryptoHash} = require('../util'); // using the cohesive utility.
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {  // describing a block of tests for the blockchain class.
    let blockchain, newChain, originalChain, errorMock;

    beforeEach(() => {  // every test in the file is going to get a fresh instance of the blockchain.
        blockchain = new Blockchain();  // this is the blockchain chain and we have to copy this chain on the line 11.
        newChain = new Blockchain();
        originalChain = blockchain.chain;  // copy of the chain.
        errorMock = jest.fn();
        global.console.error = errorMock; // these two lines quiet
    });

    it('contains a `chain` Array instance', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    it('starts with the genesis block', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });

    it('adds a new block to the chain', () => {
        const newData = 'foo bar';
        blockchain.addBlock({data: newData});

        expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
    });

    describe('isValidChain()', () => {
        describe('when the chain does not start with the genesis block', () => {
            it('returns false', () => {
                blockchain.chain[0] = {data: 'fake-genesis'};

                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });

        describe('when the chain starts with the genesis block and has mutlitple blocks', () => {
            beforeEach(() => {
                blockchain.addBlock({data: 'Bears'});
                blockchain.addBlock({data: 'Beets'});
                blockchain.addBlock({data: 'Battlestar Galactica'});
            });
            describe('and a lastHash reference has changed', () => {
                it('returns false', () => {

                    blockchain.chain[2].lastHash = 'broken-lastHash'; // intentionally mess up with one of the blocks of the chain.

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('the chain contains a block with an invalid field', () => {
                it('returns false', () => {

                    blockchain.chain[2].data = 'some-bad-and-evil-data'; // intentionally mess up with one of the blocks of the chain.

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains a block with a jumped difficulty', () => {
                it('returns false', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lastHash = lastBlock.hash;

                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;

                    const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);
                    const badBlock = new Block({timestamp, lastHash, hash, nonce, difficulty, data});
                    blockchain.chain.push(badBlock);

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain does not contain any invalid blocks', () => {
                it('returns true', () => {

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        });
    });

    describe('replaceChain()', () => {
        let logMock;

        logMock = jest.fn();

        global.console.log = logMock;     // the console output.

        describe('when  the new chain is not longer', () => {
            beforeEach(() => {
                newChain.chain[0] = {new: 'chain'};
                blockchain.replaceChain(newChain.chain);
            });

            it('it does not replace the chain', () => {
                newChain.chain[0] = {new: 'chain'};  // now this is a different chain.

                blockchain.replaceChain(newChain.chain);

                expect(blockchain.chain).toEqual(originalChain);
            });

            it('logs and error', () => { // this test checks whether it logs an error.
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('when the new chain is longer', () => {   // in this case too, it only returns true when the incoming(new) chain is valid.
            beforeEach(() => {
                newChain.addBlock({data: 'Bears'});  // we are adding these blocks because we want the new chain to be long.
                newChain.addBlock({data: 'Beets'});
                newChain.addBlock({data: 'Battlestar Galactica'});
            });

            describe('and the chain is invalid', () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'some-fake-hash';
                    blockchain.replaceChain(newChain.chain);
                });

                it('does not replace the chain', () => {
                    newChain.chain[2].hash = 'some-fake-hash';
                    blockchain.replaceChain(newChain.chain);
                    expect(blockchain.chain).toEqual(originalChain);
                });
                it('logs an error', () => {
                    expect(errorMock).toHaveBeenCalled();
                });
            });
            describe('and the chain is valid', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                });
                it('replaces the chain', () => {
                    blockchain.replaceChain(newChain.chain);
                    expect(blockchain.chain).toEqual(newChain.chain);
                });

                it('logs about the chain replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the `validTransactions` flag is true', () => {
            it('calls validTransactionData()', () => {
                const validTransactionDataMock = jest.fn();

                blockchain.validTransactionData = validTransactionDataMock;

                newChain.addBlock({ data: 'foo' });
                blockchain.replaceChain(newChain.chain, true);

                expect(validTransactionDataMock).toHaveBeenCalled();
            });
        });

    });

    describe('validTransactionData()', () => {
        let transaction, rewardTransaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({recipient: 'foo-address', amount: 65});
            rewardTransaction = Transaction.rewardTransaction({minerWallet: wallet});
        });

        describe('and the transaction data is valid', () => {
            it('returns true', () => {
                newChain.addBlock({data: [transaction, rewardTransaction]});

                expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(true);
                expect(errorMock).not.toHaveBeenCalled();
            });
        });

        describe('and the transaction data has multiple rewards', () => {
            it('returns false and logs an error', () => {
                newChain.addBlock({data: [transaction, rewardTransaction, rewardTransaction]});

                expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and the transaction data has at least one malformed outputMap', () => {
            describe('and the transaction is not a reward transaction', () => {
                it('returns false and logs an error', () => {
                    transaction.outputMap[wallet.publicKey] = 999999;

                    newChain.addBlock({data: [transaction, rewardTransaction]});

                    expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction is a reward transaction', () => {
                it('returns false and logs an error', () => {
                    rewardTransaction.outputMap[wallet.publicKey] = 999999;
                    newChain.addBlock({data: [transaction, rewardTransaction]});

                    expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the transaction data has at least one malformed input', () => {
            it('returns false and logs an error', () => {
                wallet.balance = 9000;

                const evilOutputMap = {
                    [wallet.publicKey]: 8900,
                    fooRecipient: 100
                };

                const evilTransaction = {
                    input: {
                        timestamp: Date.now(),
                        amount: wallet.balance,
                        address: wallet.publicKey,
                        signature: wallet.sign(evilOutputMap)
                    },
                    outputMap: evilOutputMap
                }
                
                newChain.addBlock({ data: [evilTransaction, rewardTransaction]});

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and a block contains multiple identical transactions', () => {
            it('returns false and logs an error', () => {
                newChain.addBlock({
                    data: [transaction, transaction, transaction, rewardTransaction]
                });

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });
    });
});