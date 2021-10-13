const uuid = require('uuid/v1'); // for generating unique ids.
const {verifySignature} = require('../util');
const {REWARD_INPUT, MINING_REWARD} = require('../config');

//  By including signature in the input, the senderWallet officially validates the transaction.
class Transaction {
    constructor({senderWallet, recipient, amount, outputMap, input}) {
        this.id = uuid();
        this.outputMap = outputMap || this.createOutputMap({senderWallet, recipient, amount});
        this.input = input || this.createInput({senderWallet, outputMap: this.outputMap});
    }

    createOutputMap({senderWallet, recipient, amount}) {
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;
        
        return outputMap;
    }

    createInput({senderWallet, outputMap}) {
        return {
            timestamp: Date.now(),
            amount: senderWallet.balance,
            address: senderWallet.publicKey,
            signature: senderWallet.sign(outputMap)
        };
    }

    update({senderWallet, recipient, amount}) {
      if(amount > this.outputMap[senderWallet.publicKey]) {
        throw new Error('Amount exceeds balance');
      }

      if (!this.outputMap[recipient]) { // if the recipient does not exist in the outputMap.
        this.outputMap[recipient] = amount;
      } else { // if the recipient exists in the outputMap.
        this.outputMap[recipient] = this.outputMap[recipient] + amount;
      }

      this.outputMap[senderWallet.publicKey] = this.outputMap[senderWallet.publicKey] - amount;

      this.input = this.createInput({senderWallet, outputMap: this.outputMap});

      // Two references to the same object in javascript are always going to be treated as equal.
    }

    static validTransaction(transaction) {
      const {input: {address, amount, signature}, outputMap} = transaction;

      const outputTotal = Object.values(outputMap).reduce((total, outputAmount) => total + outputAmount);

      if(amount !== outputTotal) {
        console.error(`Invalid transaction from ${address}`);
        return false; 
      }

        if(!verifySignature({publicKey: address, data: outputMap, signature: signature})) {
          console.error(`Invalid transaction from ${address}`);
          return false;
        }

      return true;
    }

    static rewardTransaction({minerWallet}) {
      return new this({
        input: REWARD_INPUT,
        outputMap: {[minerWallet.publicKey]: MINING_REWARD}
      });
    }
}

module.exports = Transaction; // exporting the Transaction class.