# JukeBox
Integrates Slackbot websocket with YouTube api to allow queueing music on remote device via Slack chatroom, for your coworkers entertainment or suffering


# What is it for?
It is for very specific case: 

When you have a sound system with only one port plugget to only one source device, but you still want to allow multiple people to play the music through this sound system.

Plus, we can assume each and every person can use Slack.

# How to use it?

1. Copy files
2. Change config.js data
⋅⋅* Create new bot integration for your Slack team and obtain bot's api token/key
⋅⋅* Create project in Google Developer Console, enable YouTuble api and obtain YouTube's api token/key
3. Launch index.html in browser
4. Plug in your sound system's input cable
5. Invite bot to any channel on Slack
6. Send `help` message to a channel shared with bot for more info

# How it works?

JavaScript based bot opens Slack RTM websocket and gathers information about all activities in it's team.

**Yes, it sees mostly everything that is sent in group channels or private messages it is in.**

**No, it does not send it anywhere and no data is stored outside browser's chache.**

During connecting to Slack bot should also create few Youtube Iframe players in browser. After both things are done, bot starts to look for youtube links in chat messages, sends requests to Youtube api for more informations about them and queues them. First video from queue is supposed to be played in one of the Iframes (additional Iframe players are used to buffer videos before playing them for smoother transition).
