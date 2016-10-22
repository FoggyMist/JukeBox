class MessageQueue {
    constructor(bot) {
        this.pendingMessages = {};
    }

    add(message) {
        this.pendingMessages[message.id] = message;
    }

    remove(message) {
        if (message.ok) {
            delete this.pendingMessages[message.reply_to];
        } else {
            console.log('message: ', this.pendingMessages[message.reply_to]);
            console.log('returned error: ', message.error);
        }
    }
}
