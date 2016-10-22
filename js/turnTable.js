class TurnTable {
    constructor() {
        this.musicQueue = null;
        this.players = [];
        this.currentlyUsedPlayer = 0;
        this.nextVideoCache = undefined;
        this.playersReady = 0;
        this.isQueueEmpty = false;
        this.watcher = null;
        this.watcherInterval = 2000; // in ms
        this.bufferingTime = 3 + 10 // in s, 3s is bare minimum
        this.crossFaderTime = 0 // in s, crossFader is added to buffering, not taken from it
        this.defaultVolume = 60; // in %, 100 is 100%
    }

    generateDecks() {
        let screenWidth = $('html').width() - 30;
        let playerWidth = screenWidth / 2;
        let playerHeight = (playerWidth / 16) * 9;

        let playerSettings = {
            width: playerWidth,
            height: playerHeight,
            playerVars: {
                cc_load_policy: 1,
                // controls: 0,
                fs: 0,
                iv_load_policy: 3,
                rel: 0,
            },
            events: {
                'onReady': () => {
                    this.playersReady++;
                },
                'onStateChange': (event) => {
                    // -1 (unstarted)
                    //  0 (ended)
                    //  1 (playing)
                    //  2 (paused)
                    //  3 (buffering)
                    //  5 (video cued)
                    console.log('state: ', event.data, event.target);
                    if (event.data == 0
                        && event.target.isVideoEnding
                    ) {
                        this.swapDecks(event.target);
                    }
                },
                'onError': (event) => {
                    console.log('error: ', event.data, event.target);

                    let textBack = '*WARNING* \nVideo _"' + event.target.videoData.title + '"_ has been skipped and removed from queue, \n*reason*: ';
                    switch (event.data) {
                        case 2:
                            textBack += 'The request contains an invalid parameter value.';
                        break;

                        case 5:
                            textBack += 'The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.';
                        break;

                        case 100:
                            textBack += 'The video requested was not found. This error occurs when a video has been removed (for any reason) or has been marked as private.';
                        break;

                        case 101:
                        case 150:
                            textBack += 'The owner of the requested video does not allow it to be played in embedded players.';
                        break;

                        default:
                            textBack += 'worse than excepted';
                        break;
                    }

                    console.log('embedded problems: ', textBack, event.target.videoData);

                    bot.sendSocketData({
                        type: 'message',
                        text: textBack,
                        channel: event.target.videoData.channel
                    });

                    this.skipVideo(event.target);
                }
            }
        }

        this.players[0] = new YT.Player('deck1', playerSettings);

        this.players[1] = new YT.Player('deck2', playerSettings);


        // $('body').append('<div id="deck3" style="display:none;"></div>')
        // this.players[2] = new YT.Player('deck3', playerSettings);
    }

    swapDecks() {
        let currentPlayer = this.players[this.currentlyUsedPlayer];
        currentPlayer.isVideoEnding = false;
        this.musicQueue.deleteVideo(currentPlayer.videoData);

        if (this.currentlyUsedPlayer >= 0 && this.currentlyUsedPlayer <= 1) {
            this.currentlyUsedPlayer = 1 - this.currentlyUsedPlayer;
        } else {
            this.currentlyUsedPlayer = 0;
        }

        if (this.musicQueue.queue.byOrder.length) {
            this.players[this.currentlyUsedPlayer].playVideo();
            this.startWatcher();
        }
    }

    newVideoAdded(queuePosition) {
        if (queuePosition == 0) {
            this.playFirstVideo();
        } else if (queuePosition == 1
            && this.isQueueEmpty
        ) {
            let video = this.musicQueue.queue.byOrder[1];
            let secondaryPlayer = this.players[1 - this.currentlyUsedPlayer];
            secondaryPlayer.cueVideoById({
                videoId: video.id,
                startSeconds: video.start,
                endSeconds: video.stop,
            });
            secondaryPlayer.videoData = video;
            this.isQueueEmpty = false;
        }
    }

    playFirstVideo() {
        let video = this.musicQueue.queue.byOrder[0];
        if (video == undefined) {
            console.log('no video to play', this.musicQueue.queue);
            return;
        }

        let currentPlayer = this.players[this.currentlyUsedPlayer];
        currentPlayer.loadVideoById({
            videoId: video.id,
            startSeconds: video.start,
            endSeconds: video.stop,
        });
        currentPlayer.videoData = video;
        this.startWatcher();
    }

    queueNextVideo() {
        this.stopWatcher();

        let video = this.musicQueue.queue.byOrder[1];

        if (video == undefined) {
            console.log('no video to queue', this.musicQueue.queue);
            this.isQueueEmpty = true;
            return;
        }

        this.isQueueEmpty = false;
        if (this.currentlyUsedPlayer < 0
            || this.currentlyUsedPlayer > 1
        ) {
            return;
        }

        this.nextVideoCache = video;
        let secondaryPlayer = this.players[1 - this.currentlyUsedPlayer];
        secondaryPlayer.cueVideoById({
            videoId: video.id,
            startSeconds: video.start,
            endSeconds: video.stop,
        });
        secondaryPlayer.videoData = video;
        secondaryPlayer.seekTo(secondaryPlayer.videoData.start, true);
        // stopping right after seek does not start buffering
        // stopping after fixed time does not work when video takes a bit longer to load
        secondaryPlayer.pauseVideo();
        setTimeout(() => {
            secondaryPlayer.pauseVideo();
        }, 1000);
        setTimeout(() => {
            secondaryPlayer.pauseVideo();
        }, 1300);
        setTimeout(() => {
            secondaryPlayer.pauseVideo();
        }, 1700);
        setTimeout(() => {
            secondaryPlayer.pauseVideo();
        }, 2200);
        setTimeout(() => {
            secondaryPlayer.pauseVideo();
        }, 3000);
    }


    startWatcher() {
        if (this.watcher != null) {
            return;
        }

        this.watcher = setInterval(() => {
            let currentPlayer = this.players[this.currentlyUsedPlayer];
            if (currentPlayer.videoData != undefined
                && (currentPlayer.videoData.stop - this.bufferingTime - this.crossFaderTime) < currentPlayer.getCurrentTime()
            ) { // video should stop soon
                currentPlayer.isVideoEnding = true; // used to prevent stop event from triggering twice
                this.queueNextVideo();
            }

            // player state changes are handled via ytAPI events/callbacks, they are faster than watcherInterval, do NOT stop/start videos here
        }, this.watcherInterval);
    }

    stopWatcher() {
        clearInterval(this.watcher);
        this.watcher = null;
    }

    skipVideo(targetPlayer) {
        targetPlayer.isVideoEnding = false;
        this.musicQueue.deleteVideo(targetPlayer.videoData);
        this.queueNextVideo();
    }

    forceVideo() {
        this.stopWatcher();

        let currentPlayer = this.players[this.currentlyUsedPlayer];
        currentPlayer.isVideoEnding = false;

        if (this.musicQueue.queue.byOrder.length > 1) {
            this.isQueueEmpty = false;
            let video = this.musicQueue.queue.byOrder[1];
            let secondaryPlayer = this.players[1 - this.currentlyUsedPlayer];
            secondaryPlayer.cueVideoById({
                videoId: video.id,
                startSeconds: video.start,
                endSeconds: video.stop,
            });
            secondaryPlayer.videoData = video;
        } else {
            this.isQueueEmpty = true;
        }

        currentPlayer.stopVideo();
        if (!this.isQueueEmpty) {
            this.swapDecks();
        } else {
            this.musicQueue.deleteVideo(currentPlayer.videoData);
        }
    }

    setVolume(newVolume) {
        this.players[0].setVolume(newVolume);
        this.players[1].setVolume(newVolume);
    }

    pause() {
        //  1 (playing)
        //  2 (paused)
        //  3 (buffering)
        let currentPlayer = this.players[this.currentlyUsedPlayer];
        switch (currentPlayer.getPlayerState()) {
            case 1:
            case 3:
                currentPlayer.pauseVideo();
            break;

            case 2:
                currentPlayer.playVideo();
            break;
        }
    }
}


var turnTable = new TurnTable();

function onYouTubeIframeAPIReady() {
    turnTable.generateDecks();
    this.status = 'connected';
}
