console.log("Twitter Giveaway Bot is starting...\n");

var Twitter = require("twitter");
var config = require("./config.json");
var SortedSet = require("collections/sorted-set");
var fs = require("fs");

var T = new Twitter(config.credentials);

var params = {
    q: config.search_query,
    count: 100,
    result_type: "recent",
    lang: "en",
};

var tweets = new SortedSet(
    [],
    (a, b) => a.id_str == b.id_str,
    (a, b) => {
        if (a.id_str > b.id_str) {
            return 1;
        } else if (a.id_str < b.id_str) {
            return -1;
        }
        return 0;
    }
);
var following = []; // array of user_id strings, max 2000 following at a time

function getTweets() {
    var count = 0;
    T.get("search/tweets", params)
        .then((data) => {
            console.log(`Query returned ${data.statuses.length} tweets`);

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

            console.log(tweets.length);
            console.log(`Found ${count} giveaway(s)`);

            recordData(
                "getTweets.csv",
                data.statuses.length + "," + count + "\n"
            );
        })
        .catch((err) => {
            console.log(err);
        });
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
        Date.now() - Date.parse(tweet.created_at) > 86400000 //604800000
    ) {
        return false;
    }

    var tweetText = tweet.text.toLowerCase();
    for (let j = 0; j < config.ignore_keywords.length; j++) {
        if (tweetText.includes(config.ignore_keywords[j])) {
            return false;
        }
    }

    var userScreenName = tweet.user.screen_name.toLowerCase();
    for (let j = 0; j < config.ignore_screen_names.length; j++) {
        if (userScreenName == config.ignore_screen_names[j]) {
            return false;
        }
    }

    for (let j = 0; j < config.rewteet_keywords.length; j++) {
        if (tweetText.includes(config.rewteet_keywords[j])) {
            return true;
        }
    }
    return false;
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
        status: "@BendenTooley Check this out",
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

function matchesLike(tweetText) {
    for (let j = 0; j < config.favorite_keywords.length; j++) {
        if (tweetText.includes(config.favorite_keywords[j])) {
            return true;
        }
    }
    return false;
}

function matchesFollow(tweetText) {
    for (let j = 0; j < config.follow_keywords.length; j++) {
        if (tweetText.includes(config.follow_keywords[j])) {
            return true;
        }
    }
    return false;
}

function matchesComment(tweetText) {
    for (let j = 0; j < config.comment_keywords.length; j++) {
        if (tweetText.includes(config.comment_keywords[j])) {
            return true;
        }
    }
    return false;
}

function enterGiveaway() {
    if (tweets.length > 0) {
        var tweet = tweets.shift();
        var tweetText = tweet.text.toLowerCase();
        retweet(tweet);
        if (matchesLike(tweetText)) {
            likeTweet(tweet);
        }
        if (matchesFollow(tweetText)) {
            followTweeter(tweet);
        }
        if (matchesComment(tweetText)) {
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
    console.log(`New since_id is ${params.since_id}`);
    getTweets();
    console.log("\n");
}, 1000 * 15);

setInterval(() => {
    enterGiveaway();
}, 1000 * 60 * 3);
