class Commands {
    constructor(bot) {
        this.bot = bot;
        this.musicQueue = new MusicQueue(bot);
        this.noPermissionTextBack = 'Sadly, you have no permission to do it';
    }

    help() {
        let textBack = '*List of available commands:* \n';
        textBack += ' list - videos in queue\n';
        textBack += ' np - now playing video\n';
        textBack += ' ping - pointlessly pings the bot\n';
        textBack += ' _"any youtube link"_ - adds video to youtube\n';
        textBack += ' claimAdmin - become one of two admins till logout\n';
        textBack += ' listAdmins - check who was faster than you\n\n';

        textBack += '*Commands that require privilages* (your video is playing or you are an admin): \n';
        textBack += ' play - toggles video state\n';
        textBack += ' pause - toggles video state\n';
        textBack += ' volume X - sets video volume to x%, volume 100 for maximum volume\n';
        textBack += ' skip - currently playing video\n';
        return textBack;
    }

    list() {
        return this.musicQueue.list();
    }

    ping() {
        return 'pong';
    }

    nowPlaying() {
        return this.musicQueue.nowPlaying();
    }

    ytLink(action) {
        return this.musicQueue.add(action);
    }

    claimAdmin(action) {
        if (config.admins.length < 2) {
            config.admins.push(action.user);
            let user = this.bot.getUserById(action.user);
            return user.username + ' has become new admin';
        }
    }

    listAdmins() {
        let loop = 0;
        let loopEnd = config.admins.length;
        if (loopEnd == 0) {
            return 'No admins yet';
        }

        let textBack = 'Current admins: \n';

        while(loop < loopEnd) {
            let user = this.bot.getUserById(config.admins[loop]);
            textBack += user.username + '\n';
            loop++;
        }

        return textBack;
    }

    pause() {
        if (this.musicQueue.checkAdminPrivilages(action.user)) {
            this.musicQueue.pause();
        } else {
            return this.noPermissionTextBack;
        }
    }

    setVolume(action) {
        if (this.musicQueue.checkAdminPrivilages(action.user)) {
            let parsed = action.text.match(/volume[\s]*([0-9]+)/);
            if (parsed) {
                let volume = parsed[1];
                return this.musicQueue.setVolume(volume);
            }

            return 'Invalid volume value';
        } else {
            return this.noPermissionTextBack;
        }
    }

    skip(action) {
        if (this.musicQueue.checkAdminPrivilages(action.user)) {
            return this.musicQueue.skip(action);
        } else {
            return this.noPermissionTextBack;
        }
    }
}
