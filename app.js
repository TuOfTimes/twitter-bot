console.log("Twitter Giveaway Bot is starting...\n");

var Twitter = require("twitter");
var config = require("./config.js");

var T = new Twitter(config);

var params = {
    q: "(giveaway OR win OR competition) (retweet OR RT)",
    count: 100,
    result_type: "recent",
    lang: "en",
};

function getTweets(tweetHandler) {
    var count = 0;
    T.get("search/tweets", params)
        .then((data) => {
            console.log(`Query returned ${data.statuses.length} tweets`);

            for (let i = 0; i < data.statuses.length; i++) {
                if (count == 20) {
                    params.since_id = data.statuses[i].id_str;
                    break;
                }
                // interact with tweet if it is actually a giveaway
                if (
                    data.statuses[i].in_reply_to_status_id_str == null &&
                    !data.statuses[i].text.startsWith("RT @") &&
                    !data.statuses[i].retweeted &&
                    !data.statuses[i].text.includes("gay") &&
                    !data.statuses[i].text.includes("nsfw") &&
                    !data.statuses[i].text.includes("kpop") &&
                    !data.statuses[i].text.includes("sugar daddy")
                ) {
                    // console.log(data.statuses[i]);
                    count++;
                    tweetHandler(data.statuses[i]);
                }
            }

            if (count != 20) {
                params.since_id = data.search_metadata.max_id_str;
            }

            console.log(`Entered ${count} giveaway(s)`);
        })
        .catch((err) => {
            console.log(err);
        });
}

function likeTweet(tweet) {
    T.post("favorites/create", { id: tweet.id_str })
        .then((response) => {
            console.log(
                "Favorited: ",
                `https://twitter.com/anyuser/status/${response.id_str}`
            );
        })
        .catch((err) => {
            console.log(err[0].message);
        });
}

function retweet(tweet) {
    T.post("statuses/retweet/" + tweet.id_str, {})
        .then((response) => {
            console.log(
                "Retweeted: ",
                `https://twitter.com/anyuser/status/${response.id_str}`
            );
        })
        .catch((err) => {
            console.log(err[0].message);
        });
}

function followTweeter(tweet) {
    T.post("friendships/create", {
        screen_name: tweet.user.screen_name,
        user_id: tweet.user.id_str,
        follow: true,
    })
        .then((response) => {
            console.log("Followed: ", `@${response.screen_name}`);
        })
        .catch((err) => {
            console.log(err[0].message);
        });
}

function tagFriend(tweet) {
    T.post("statuses/update", {
        status: "@GiveawayBot14 Check this out",
        in_reply_to_status_id_str: tweet.id_str,
        auto_populate_reply_metadata: true,
    })
        .then((response) => {
            console.log(
                "Commented: ",
                `https://twitter.com/anyuser/status/${response.id_str}`
            );
        })
        .catch((err) => {
            console.log(err[0].message);
        });
}

function enterGiveaway(tweet) {
    likeTweet(tweet);
    followTweeter(tweet);
    retweet(tweet);
}

getTweets(enterGiveaway);

setInterval(() => {
    console.log(`New since_id is ${params.since_id}`);
    getTweets(enterGiveaway);
    console.log("\n");
}, 1000 * 60 * 6);
