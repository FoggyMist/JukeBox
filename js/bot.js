class Bot {
    constructor() {
        this.enumStatus = {
            'initial': 'initial',
            'establishing': 'establishing',
            'failed': 'failed',
            'connected': 'connected',
            'error': 'error',
            'closed': 'closed',
        };
        this.setStatus('initial');
        this.urls = {};
            this.urls.baseApiUrl = 'https://slack.com/api/';
            this.urls.rtmStart =  this.urls.baseApiUrl + 'rtm.start';

        this.socket = null;
        this.sentDataId = 1;
        this.slackState = {};
        this.behavior = new Behavior(this);
        this.messageQueue = new MessageQueue();
    }

    connectRequest(apiKey = config.botApiKey) {
        return $.ajax({
            url: this.urls.rtmStart,
            dataType: 'json',
            data: {
                token: apiKey,
                simple_latest: true,
                no_unreads: true,
                mpim_aware: false
            }
        })
        .done((data) => {
            console.log(data);
            this.slackState = data;
        })
        .fail((error) => {
            console.log(error);
            this.setStatus('error');
        });
        // .always(function(request) {
        // });
    }

    connectWebsocket(socketUrl = this.slackState.url) {
        this.socket = new WebSocket(socketUrl);
        this.socket.onopen = () => this.onSocketOpen();
        this.socket.onmessage = (message) => this.receiveSocketData(message);
        this.socket.onerror = () => this.onSocketError();
        this.socket.onclose = () => this.onSocketClose();
    }

    onSocketOpen() {
        this.setStatus('establishing');
    }

    onSocketError() {
        this.setStatus('error');
    }

    onSocketClose() {
        this.setStatus('closed');
    }

    receiveSocketData(message,a,b,c,d,e) {
        let data = JSON.parse(message.data);

        if (data.ok != undefined) {
            this.messageQueue.remove(data);
        } else if (data.type != undefined
                && data.reply_to == undefined
            ) {
            this.behavior.reaction(data);
        } else if (data.ts > this.slackState.cache_ts){
            console.log('unexcepted data received: ', data);
        }
    }

    sendSocketData(data) {
        if (this.status != this.enumStatus.connected) {
            console.log('unexcepted bot status, current status: ' + this.status);
            return;
        }

        if (data.id == undefined) {
            data.id = this.sentDataId++;
        }

        this.messageQueue.add(data);
        this.socket.send(JSON.stringify(data));
    }

// ^^^^^^^^^^^^^^^^^^
// ^^ PRIVATE PART ^^
// ^^^^^^^^^^^^^^^^^^

// vvvvvvvvvvvvvvvvv
// vv PUBLIC PART vv
// vvvvvvvvvvvvvvvvv

    connect() {
        if (this.status != this.enumStatus.initial) {
            console.log('bot is already conneted');
            return;
        }

        this.connectRequest().then((data, status) => {
            if (status == 'success') {
                this.connectWebsocket();
            }
        });
    }

    setStatus(newStatus) {
        if (this.enumStatus[newStatus] == undefined) {
            console.log('unexcepted bot status: ' + newStatus);
            return;
        }

        this.status = this.enumStatus[newStatus];
    }

    updateSlackState(property, value) {
        if (this.slackState[property] != undefined
            && this.slackState[property].constructor == Array
        ) {
            this.slackState[property].push(value);
        }
    }

    getUserById(userId) {
        if (this.slackState.usersById == undefined) {
            this.slackState.usersById = {};
        }

        if (this.slackState.usersById[userId] == undefined) {
            let loop = 0;
            let loopEnd = this.slackState.users.length;
            while (loop < loopEnd) {
                let user = this.slackState.users[loop];
                let username;
                if (user.real_name != undefined) {
                    username = user.real_name;
                } else if (user.profile != undefined
                    && user.profile.real_name != undefined
                ) {
                    username = user.profile.real_name;
                } else {
                    username = 'Uglyname von ' + user.name;
                }

                user.username = username;

                if (user.id == userId) {
                    this.slackState.usersById[userId] = user;
                    return user;
                }

                loop++;
            }

            console.log('no user found', userId, this.slackState.users);
            this.setStatus('error');
            return {username: 'no user found'};
        } else {
            return this.slackState.usersById[userId];
        }
    }
};

/*
{
    "ok": true,
    "url": "wss:\/\/ms9.slack-msgs.com\/websocket\/7I5yBpcvk",

    "self": {
        "id": "U023BECGF",
        "name": "bobby",
        "prefs": {
            …
        },
        "created": 1402463766,
        "manual_presence": "active"
    },
    "team": {
        "id": "T024BE7LD",
        "name": "Example Team",
        "email_domain": "",
        "domain": "example",
        "icon": {
            …
        },
        "msg_edit_window_mins": -1,
        "over_storage_limit": false
        "prefs": {
            …
        },
        "plan": "std"
    },
    "users": [ … ],

    "channels": [ … ],
    "groups": [ … ],
    "mpims": [ … ],
    "ims": [ … ],

    "bots": [ … ],
}
*/
