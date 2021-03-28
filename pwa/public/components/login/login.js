import "https://unpkg.com/twitch-js@2.0.0-beta.42/dist/twitch.js";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
//const queryString = window.location.search;
//const searchParams = new URLSearchParams(queryString)
const hashString = window.location.hash;
const hashParams = new URLSearchParams(hashString.replace("#","?"));
// Extract token var hash = window.location.hash.split('#')[1].split('&')[0].split('=');
const token = hashParams.get('access_token');
export default async () => {
    // Check if user comes from twitch authentication
    if (token) {
        //etMe(withEmail)
        // Remove token from URL
        history.pushState("", document.title, window.location.pathname);
        window.localStorage.setItem('access-token',token)
        
        /**
  curl -H 'Accept: application/vnd.twitchtv.v5+json' \
-H 'Client-ID: uo6dggojyb8d6soh92zknwmi5ej1q2' \
-H 'Authorization: OAuth cfabdegwdoklmawdzdo98xt2fo512y' \
-X GET 'https://api.twitch.tv/kraken/user'

{
    "_id": 44322889,
    "bio": "Just a gamer playing games and chatting. :)",
    "created_at": "2013-06-03T19:12:02Z",
    "display_name": "dallas",
    "email": "email-address@provider.com",
    "email_verified": true,
    "logo": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
    "name": "dallas",
    "notifications": {
        "email": false,
        "push": true
    },
    "partnered": false,
    "twitter_connected": false,
    "type": "staff",
    "updated_at": "2016-12-14T01:01:44Z"
}

         */

        /**
         curl -H 'Accept: application/vnd.twitchtv.v5+json' \
-H 'Authorization: OAuth cfabdegwdoklmawdzdo98xt2fo512y' \
-X GET https://api.twitch.tv/kraken
Gets this response:

{
   "token": {
      "authorization": {
         "created_at": "2016-12-14T15:51:16Z",
         "scopes": [
            "user_read"
         ],
         "updated_at": "2016-12-14T15:51:16Z"
      },
      "client_id": "uo6dggojyb8d6soh92zknwmi5ej1q2",
      "user_id": "44322889",
      "user_name": "dallas",
      "valid": true
   }
}
         */


        // Fetch username for full chat authability
        const { api } = new window.TwitchJs({ token, clientId, });
        const channelId = (username.length > 0) ? await api.get(`users?login=${username}`).then(r=>r.data[0].id) : channelId;
        
        const followersPromise = () => api.get(`users/follows?to_id=${channelId}`).then(response => {
            return {
                follower: response.total,
                last_follower: response.data[0]?.fromName
            }           
        });    
    } else {
        //show it and click it
        // Twitch API Client ID and dialogikTV channel ID
        const username = window.username || 'dialogikTV'
        const subFolder = window.subFolder ?? 'obs-twitch-api-overlay/'
        const clientId = window.clientId || 'mn01zj33eftqrsn760lac2l7nwnrls';
        const channelId = window.channelId || '265345534';
        const twitchConnectorHtml = `<a id="twitchConnector" href="https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${window.location.href}&response_type=token&scope=user:read:email">Twitch Connector</a>`
        const twitchConnector = document.createElement('a');
        twitchConnector.id = 'twitchConnector'
        twitchConnector.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${window.location.href}&response_type=token&scope=user:read:email`
        twitchConnector.innerText = 'Twitch Connector'

        document.body.append(twitchConnector)
        //delay(2000).then(()=> twitchConnector.click());
    }

}

