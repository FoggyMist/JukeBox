class Behavior {
    constructor(bot) {
        this.bot = bot;
        this.commands = new Commands(bot);
    }

    findOwnerChannel() {
        if (this.ownerChannelId != undefined) {
            return;
        }

        let ims = this.bot.slackState.ims;
        let loop = 0;
        let loopEnd = ims.length;
        while (loop < loopEnd) {
            if (ims[loop].user == config.ownerId) {
                this.ownerChannelId = ims[loop].id;
                break;
            }
            loop++;
        }
    }

    reaction(action) {
        switch (action.type) {
            case 'hello':
                this.hello();
            break;

            case 'message':
                let channelType = action.channel.substring(1, 0);
                action.text = ' ' + action.text + ' ';
                switch (channelType) {
                    case 'D': // direct message - private message
                        this.privateMessage(action);
                    break;

                    case 'C': // channel - open group
                    case 'G': // group - closed group
                        this.groupMessage(action);
                    break;

                    default:
                        console.log('unknown channelType: ', action);
                    break;
                }
            break;

            case 'im_created':
                this.bot.updateSlackState('ims', action.channel);
            break;

            case 'group_joined':
                this.bot.updateSlackState('groups', action.channel);
            break;

            case 'channel_joined':
                this.bot.updateSlackState('channels', action.channel);
            break;

            default:
                console.log(action);
            break;
        }
    }

    hello() {
        this.bot.setStatus('connected');

        this.findOwnerChannel();
        // this.bot.sendSocketData({
        //     type: 'message',
        //     text: 'ready to roll',
        //     channel: this.ownerChannelId
        // });
    }

    groupMessage(action) {
        let textBack = null;

        if (action.text.indexOf(' ping ') + 1) {
            textBack = this.commands.ping(action);

        } else if (action.text.indexOf('youtu') + 1) {
            textBack = this.commands.ytLink(action);

        } else if (action.text.indexOf(' np ') + 1) {
            textBack = this.commands.nowPlaying();

        } else if (action.text.indexOf(' list ') + 1) {
            textBack = this.commands.list();

        } else if (action.text.indexOf(' pause ') + 1) {
            textBack = this.commands.pause();

        } else if (action.text.indexOf(' play ') + 1) {
            textBack = this.commands.pause();

        } else if (action.text.indexOf(' mute ') + 1) {
            // textBack = 'Muting is pointless, use pause instead';

        } else if (action.text.indexOf(' volume') + 1) {
            textBack = this.commands.setVolume(action);

        } else if (action.text.indexOf(' skip ') + 1) {
            textBack = this.commands.skip(action);

        } else if (action.text.indexOf('commandName') + 1) {

        }

        if (textBack != null) {
            this.bot.sendSocketData({
                type: 'message',
                text: textBack,
                channel: action.channel
            });
        }
    }

    privateMessage(action) {
        let textBack = null;

        if (action.text.indexOf(' ping ') + 1) {
            textBack = this.commands.ping(action);
        } else if (action.text.indexOf('youtu') + 1) {
            // textBack = this.commands.ytLink(action);
        } else if (action.text.indexOf(' np ') + 1) {
            textBack = this.commands.nowPlaying();
        } else if (action.text.indexOf('commandName') + 1) {

        }

        if (textBack != null) {
            this.bot.sendSocketData({
                type: 'message',
                text: textBack,
                channel: action.channel
            });
        }
    }
}
