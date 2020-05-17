console.log("Twitter Giveaway Bot is starting...\n");

// require
var Twitter = require("twitter");
var config = require("./config.json");
var SortedSet = require("collections/sorted-set");
var fs = require("fs");

var T = new Twitter(config.credentials);

// global vars
var params = {
    q: config.search_query,
    count: 100,
    result_type: "recent",
    lang: "en",
};

var retweetRegex = getRegexFromList(config.rewteet_keywords);
var favoriteRegex = getRegexFromList(config.favorite_keywords);
var commentRegex = getRegexFromList(config.comment_keywords);
var followRegex = getRegexFromList(config.follow_keywords);
var ignoreKeywordsRegex = getRegexFromList(config.ignore_keywords);
var ignoreScreenNamesRegex = getRegexFromList(config.ignore_screen_names);

var tweets = new SortedSet(
    [],
    (a, b) => a.id_str == b.id_str,
    (a, b) => {
        if (a.id_str < b.id_str) {
            return 1;
        } else if (a.id_str > b.id_str) {
            return -1;
        }
        return 0;
    }
);
var following = []; // array of user_id strings, max 2000 following at a time

// functions
function getTweets() {
    var count = 0;
    T.get("search/tweets", params)
        .then((data) => {
            for (let i = 0; i < data.statuses.length; i++) {
                var tweet;
                if (
                    data.statuses[i].retweeted_status &&
                    isGiveaway(data.statuses[i].retweeted_status)
                ) {
                    tweet = data.statuses[i].retweeted_status;
                } else if (isGiveaway(data.statuses[i])) {
                    tweet = data.statuses[i];
                }

                if (tweet && !tweets.has(tweet)) {
                    count++;
                    tweets.push(tweet);
                    recordData("tweets.txt", tweet.text + "\n---\n");
                }
            }

            params.since_id = data.search_metadata.max_id_str;

            console.log(
                `[Tweets] Found ${count} giveaways from ${data.statuses.length} searched tweets`
            );
            console.log(
                `[Tweets] Currently have ${tweets.length} stored giveaways`
            );

            recordData(
                "getTweets.csv",
                data.statuses.length + "," + count + "\n"
            );
        })
        .catch((err) => {
            console.log(err);
        });
}

function getRegexFromList(list) {
    var matchList = [];
    matchList.push("\\b", "(");
    for (let i = 0; i < list.length; i++) {
        matchList.push(list[i]);
        if (i != list.length - 1) {
            matchList.push("|");
        }
    }
    matchList.push("\\b", ")");

    return new RegExp(matchList.join(""), "i");
}

function isGiveaway(tweet) {
    // filter tweets
    if (
        tweet.user.followers_count < config.min_follower_count ||
        tweet.retweeted ||
        tweet.is_quote_status ||
        tweet.in_reply_to_status_id_str != null ||
        tweet.retweeted_status != null ||
        tweet.entities.user_mentions.length > config.max_user_mentions ||
        Date.now() - Date.parse(tweet.created_at) > 86400000
    ) {
        return false;
    }

    if (ignoreKeywordsRegex.test(tweet.text)) {
        return false;
    }

    if (ignoreScreenNamesRegex.test(tweet.user.screen_name)) {
        return false;
    }

    if (retweetRegex.test(tweet.text)) {
        return true;
    }

    return false;
}

function likeTweet(tweet) {
    T.post("favorites/create", { id: tweet.id_str })
        .then((response) => {
            console.log(
                "[Giveaway] Favorited: ",
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
                "[Giveaway] Retweeted: ",
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
            console.log("[Giveaway] Followed: ", `@${response.screen_name}`);
        })
        .catch((err) => {
            console.log(err[0].message);
        });
}

function tagFriend(tweet) {
    T.post("statuses/update", {
        status: "@BendenTooley @TuOftimes @TastyUnderwear",
        in_reply_to_status_id_str: tweet.id_str,
        auto_populate_reply_metadata: true,
    })
        .then((response) => {
            console.log(
                "[Giveaway] Commented: ",
                `https://twitter.com/anyuser/status/${response.id_str}`
            );
        })
        .catch((err) => {
            console.log(err[0].message);
        });
}

function enterGiveaway() {
    if (tweets.length > 0) {
        var tweet = tweets.shift();
        console.log(
            `[Giveaway] Entering giveaway at http://twitter.com/anyuser/status/` +
                tweet.id_str
        );
        retweet(tweet);
        if (favoriteRegex.test(tweet.text)) {
            likeTweet(tweet);
        }
        if (followRegex.test(tweet.text)) {
            followTweeter(tweet);
        }
        if (commentRegex.test(tweet.text)) {
            tagFriend(tweet);
        }
    }
}

function recordData(file, data) {
    fs.appendFile(file, data, (err) => {
        if (err) {
            console.log(err);
        }
    });
}

getTweets();
setInterval(() => {
    getTweets();
}, 1000 * 15);

setInterval(() => {
    enterGiveaway();
}, 1000 * 60 * 3);
