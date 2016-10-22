class MusicQueue {
    constructor(bot) {
        this.bot = bot;
        this.turnTable = turnTable;
        this.turnTable.musicQueue = this;
        this.ytApi = {
            url: 'https://www.googleapis.com/youtube/v3/videos',
            part: 'contentDetails,snippet,status'
        };
        this.queue = {
            byOrder: [],
            byUser: {},
            byTimestamp: {},
            byChannel: {},
            unordered: [],
        };
    }

    parseVideoId(url) {
        let ytId = null;
        let longUrlRegex = url.match(/(v=)[\w-_]+/);
        if (longUrlRegex) {
            ytId = longUrlRegex[0].substr(2);
        } else {
            let shortUrlRegex = url.match(/(be)[^\/]*\/[\w-_]+/);
            if (shortUrlRegex) {
                ytId = shortUrlRegex[0].match(/\/[\w-_]+/g);
            }
            if (ytId) {
                ytId = ytId[0].substr(1);
            }
        }

        return ytId;
    }

    getVideoInfo(ytId) {
        return $.ajax({
            url: this.ytApi.url,
            dataType: 'json',
            data: {
                key: config.youtubeApiKey,
                id: ytId,
                part: this.ytApi.part,
            }
        })
        .done((data) => {
            // console.log(data);
        })
        .fail((error) => {
            console.log(error);
            this.bot.setStatus('error');
        });
    }

    parseDurationToSec(durationString) {
        let duration = 0;

        let durationSeconds = durationString.match(/\d+S/g);
        let durationMinutes = durationString.match(/\d+M/g);
        let durationHours = durationString.match(/\d+H/g);

        if (durationSeconds) {
            durationSeconds = Number(durationSeconds[0].slice(0, -1));
            duration += (durationSeconds - 1);
        }

        if (durationMinutes) {
            durationMinutes = Number(durationMinutes[0].slice(0, -1));
            duration += durationMinutes * 60;
        }

        if (durationHours) {
            durationHours = Number(durationHours[0].slice(0, -1));
            duration += durationHours * 60 * 60;
        }

        return duration;
    }

    parseStartTime(messageString) {
        let laterStartTag = messageString.match(/t=\d+/);
        if (laterStartTag != null) {
            laterStartTag = Number(laterStartTag[0].substr(2));
        } else {
            laterStartTag = 0;
        }

        return laterStartTag;
    }

    parseStopTime(messageString) {
        let earlierStopTag = messageString.match(/e=\d+/);
        if (earlierStopTag != null) {
            earlierStopTag = Number(earlierStopTag[0].substr(2));
        } else {
            earlierStopTag = 0;
        }

        return earlierStopTag;
    }

    createVideoDataObject(videoInfo, action) {
        console.log(action);
        let start = this.parseStartTime(action.text);
        let stop = this.parseStopTime(action.text);
        let duration = this.parseDurationToSec(videoInfo.contentDetails.duration);

        if (start >= duration) {
            start = 0;
        }

        if (stop <= start) {
            stop = duration;
        }

        let video = {
            id: videoInfo.id,
            title: videoInfo.snippet.title,
            start: start,
            stop: stop,
            duration: duration, // in seconds
            owner: action.user,
            channel: action.channel,
            timestamp: Number(action.ts),
            upvotes: [],
            downvotes: [],
            score: 0,
            timestamp: action.ts
        }

        return video;
    }

    judgeVideo(videoInfo, action) {
        let video = this.createVideoDataObject(videoInfo, action);
        let totalDuration = video.stop - video.start;
        let textBack;
        if (!videoInfo.status.embeddable) {
            textBack = 'Video is cannot be used in embeded player, NOT added to queue';
        } else if (totalDuration < 4) { // video is likely to cause buffering stops bugs
            textBack = 'Video is shorter than 4s, NOT added to queue';
        } else if (totalDuration > 780) { // 13min limit
            textBack = 'Video exceeds 13min duration limit, NOT added to queue';
        } else {
            textBack = 'Video added to queue, \n*title*: _' + video.title + '_, \n*duration*: ' + secondsToHumanTime(totalDuration);
            this.indexVideo(video);
        }

        return textBack;
    }

    indexVideo(video) {
        this.queue.unordered.push(video);

        if (this.queue.byUser[video.owner] == undefined) {
            this.queue.byUser[video.owner] = [video];
        } else {
            this.queue.byUser[video.owner].push(video);
        }

        if (this.queue.byTimestamp[video.timestamp] == undefined) {
            this.queue.byTimestamp[video.timestamp] = video;
        } else {
            console.log('received two videos with same timestamp: ', video, this.queue);
            this.bot.setStatus('error');
        }

        if (this.queue.byChannel[video.channel] == undefined) {
            this.queue.byChannel[video.channel] = [video];
        } else {
            this.queue.byChannel[video.channel].push(video);
        }

        let isVideoOrdered = false;
        let usersEncountered = [];
        let totalVideosAddedFromCurrentUser = this.queue.byUser[video.owner].length - 1;
        let firstVideoOwner = null
        let queuePosition = -1;

        let loop = 0;
        let loopEnd = this.queue.byOrder.length;

        if (loopEnd > 0) {
            firstVideoOwner = this.queue.byOrder[0].owner;
        }

        while(loop < loopEnd) {
            let videoToCompare = this.queue.byOrder[loop];
            usersEncountered.push(videoToCompare.owner);
            let videosCountFromComparedUser = countElementInArray(usersEncountered, videoToCompare.owner);
            let videosCountFromCurrentUser = countElementInArray(usersEncountered, video.owner);
            if (
                (
                    totalVideosAddedFromCurrentUser == 0
                    && videosCountFromComparedUser > 1
                ) || (
                    videosCountFromCurrentUser > 0
                    && videoToCompare.owner != video.owner
                    && (videosCountFromComparedUser + (firstVideoOwner != videoToCompare.owner)) > (videosCountFromCurrentUser + (firstVideoOwner != video.owner))
                ) || (
                    videoToCompare.score < video.score
                    && loop > 0
                )
            ) {
                this.queue.byOrder.splice(loop, 0, video);
                isVideoOrdered = true;
                queuePosition = loop;
                loop = loopEnd;
            }

            loop++;
        }

        if (!isVideoOrdered) {
            this.queue.byOrder.push(video);
            queuePosition = loopEnd;
        }

        this.turnTable.newVideoAdded(queuePosition);
    }

    deleteVideo(video) {
        let isVideoFound = false;
        if (this.queue.byTimestamp[video.timestamp] != undefined) {
            isVideoFound = true;
            delete this.queue.byTimestamp[video.timestamp];
        }

        if (isVideoFound) {
            let loop = 0; // remove from byOrder
            let loopEnd = this.queue.byOrder.length;
            while(loop < loopEnd) {
                let videoToCompare = this.queue.byOrder[loop];
                if (videoToCompare.timestamp == video.timestamp) {
                    isVideoFound = true;
                    this.queue.byOrder.splice(loop, 1);
                    loop = loopEnd;
                }
                loop++;
            }

            loop = 0; // remove from byUser
            loopEnd = this.queue.byUser[video.owner].length;
            while(loop < loopEnd) {
                let videoToCompare = this.queue.byUser[video.owner][loop];
                if (videoToCompare.timestamp == video.timestamp) {
                    this.queue.byUser[video.owner].splice(loop, 1);
                    loop = loopEnd;
                }
                loop++;
            }

            loop = 0; // remove from byChannel
            loopEnd = this.queue.byChannel[video.channel].length;
            while(loop < loopEnd) {
                let videoToCompare = this.queue.byChannel[video.channel][loop];
                if (videoToCompare.timestamp == video.timestamp) {
                    this.queue.byChannel[video.channel].splice(loop, 1);
                    loop = loopEnd;
                }
                loop++;
            }

            loop = 0; // remove from unordered
            loopEnd = this.queue.unordered.length;
            while(loop < loopEnd) {
                let videoToCompare = this.queue.unordered[loop];
                if (videoToCompare.timestamp == video.timestamp) {
                    this.queue.unordered.splice(loop, 1);
                    loop = loopEnd;
                }
                loop++;
            }
        }
    }

    reorderQueue(video) {

    }

    add(action) {
        if (this.turnTable.playersReady < 2) {
            return 'Youtube players are not ready yet, try again a bit later or reload them manually';
        }

        let ytId = this.parseVideoId(action.text);

        if (ytId == null) {
            return 'YT url found, but no valid video ID found :/';
        }

        let videoInfo;
        this.getVideoInfo(ytId).then((data, status) => {
            if (status == 'success') {
                let textBack;
                if (!data.items[0]) {
                    console.log('no video found: ', action, data, status);
                    textBack = 'No video found';
                } else {
                    videoInfo = data.items[0];
                    textBack = this.judgeVideo(videoInfo, action);
                }

                this.bot.sendSocketData({
                    type: 'message',
                    text: textBack,
                    channel: action.channel
                });
            }
        });

        return 'Processing youtube link';
    }

    nowPlaying() {
        let textBack;
        if (this.queue.byOrder.length) {
            textBack = this.queue.byOrder[0].title + ', \n_youtube id: ' + this.queue.byOrder[0].id + '_';
        } else {
            textBack = 'Nothing is playing right now';
        }
        return textBack;
    }

    list() {
        let textBack = 'Videos in queue: (1st is now playing)';
        let loop = 0;
        let loopEnd = this.queue.byOrder.length;
        while(loop < loopEnd) {
            let video = this.queue.byOrder[loop];
            textBack += '\n' + (loop+1) + ') _' + video.title + '_ (' + secondsToHumanTime(video.stop - video.start) + ')   debug ts: ' + video.timestamp + '\n';
            loop++;
        }

        return textBack;
    }


    pause() {
        this.turnTable.pause();
    }

    setVolume(action) {
        this.turnTable.setVolume(action);
    }

    skip(action) {
        this.turnTable.forceSkip();
    }
}
