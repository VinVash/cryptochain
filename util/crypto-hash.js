const hexToBinary = require('hex-to-binary');  // removing this for the sake of maintaining hexa decimal hashes.

const crypto = require('crypto');

const cryptoHash = (...inputs) => {
    const hash = crypto.createHash('sha256');

    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '));

    // return hexToBinary(hash.digest('hex'));
    return hash.digest('hex');
};

module.exports = cryptoHash;
