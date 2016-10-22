class Commands {
    constructor(bot) {
        this.bot = bot;
        this.musicQueue = new MusicQueue(bot);
    }

    help() {

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
        let textResponse = this.musicQueue.add(action);
        return textResponse;
    }

    pause() {
        this.musicQueue.pause();
    }

    setVolume(action) {
        let parsed = action.text.match(/volume[\s]*([0-9]+)/);
        if (parsed) {
            let volume = parsed[1];
            return this.musicQueue.setVolume(volume);
        }

        return 'Invalid volume value';
    }

    skip(action) {
        return this.musicQueue.skip(action);
    }

    claimAdmin(action) {

    }

    listAdmins() {

    }

}
