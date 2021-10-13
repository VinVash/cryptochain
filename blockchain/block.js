const hexToBinary = require('hex-to-binary');
const {GENESIS_DATA, MINE_RATE} = require('../config');
const {cryptoHash} = require('../util');

class Block {
    constructor({ timestamp, lastHash, hash, data, nonce, difficulty }) {   //wrapping the parameters in curly braces will prevent us from worrying about their order.
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.data = data;
        this.nonce = nonce;
        this.difficulty = difficulty;
    }

    static genesis() {
        return new this(GENESIS_DATA); // return new Block(GENESIS_DATA).
    }

    static mineBlock({lastBlock, data}) {
        const lastHash = lastBlock.hash;
        let hash, timestamp;
        // const timestamp = Date.now();
        let {difficulty} = lastBlock; // we changed from const to let because we have to change the difficulty after every loop.
        let nonce = 0;

        do {
            nonce++;
            timestamp = Date.now();
            difficulty = Block.adjustDifficulty({originalBlock: lastBlock, timestamp}) // the timestamp passed here as the second parameter is the one present on line 27.
            hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
        } while(hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty));

        return new this({
            timestamp,
            lastHash,
            data,
            difficulty,
            nonce,
            hash
        });
    }

    static adjustDifficulty({originalBlock, timestamp}) {
        const {difficulty} = originalBlock;  // destruct the difficulty from the original block.

        if (difficulty < 1) return 1;
        
        const difference = timestamp - originalBlock.timestamp;

        if(difference > MINE_RATE) return difficulty - 1;  // if the mining is slow.

        return difficulty + 1;
    }
}

module.exports = Block;  // sharable with other files.

//  The miner will have to generate valid hashes until the one with proper number of leading zeroes is found.

