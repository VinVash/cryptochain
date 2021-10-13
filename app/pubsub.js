const redis = require('redis');

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub {
    constructor({blockchain, transactionPool}) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;

        this.publisher = redis.createClient();
        this.subscriber = redis.createClient();

        this.subscribeToChannels();

        this.subscriber.on('message', (channel, message) => this.handleMessage(channel, message)
        );
    }

    handleMessage(channel, message) {
        console.log(`Message received. Channel: ${channel}. Message: ${message}`);

        const parsedMessage = JSON.parse(message);

        switch(channel) {  // for each channel, we just have to add a new case statement.
            case CHANNELS.BLOCKCHAIN: // handling blockchain messages.
                this.blockchain.replaceChain(parsedMessage, true, () => {
                    this.transactionPool.clearBlockchainTransactions({
                        chain: parsedMessage
                    });
                });
                break;
            case CHANNELS.TRANSACTION: // handling transaction messages.
                this.transactionPool.setTransaction(parsedMessage);
                break;
            default:
                return;
        }
    }

    subscribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }

    publish({channel, message}) {
        this.subscriber.unsubscribe(channel, () => {  // first we unsubscribe from the channel.
            this.publisher.publish(channel, message, () => { // publish a message.
                this.subscriber.subscribe(channel); // resubscribe to the channel. This will prevent it to send redundant messages to the same local subscriber.
            });
        });
        
    }

    broadcastChain() {
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain) // we can only publish string messages on the channel, not arrays, therefore converting it to string.
        });
    }

    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        });
    }
}

module.exports = PubSub;
