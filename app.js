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
                if (
                    data.statuses[i].retweeted_status &&
                    isGiveaway(data.statuses[i].retweeted_status) &&
                    !tweets.has(data.statuses[i].retweeted_status)
                ) {
                    count++;
                    tweets.push(data.statuses[i].retweeted_status);
                    // recordData(
                    //     "tweets.txt",
                    //     data.statuses[i].retweeted_status.text + "\n---\n"
                    // );
                } else if (
                    isGiveaway(data.statuses[i]) &&
                    !tweets.has(data.statuses[i])
                ) {
                    count++;
                    tweets.push(data.statuses[i]);
                    // recordData("tweets.txt", data.statuses[i].text + "\n---\n");
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
        tweet.retweeted_status != null
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

function recordData(file, data) {
    fs.appendFile(file, data, (err) => {
        if (err) {
            console.log(err);
        }
    });
}

getTweets();
var count = 0;
var gettingTweets = setInterval(() => {
    console.log(`New since_id is ${params.since_id}`);
    getTweets();
    console.log("\n");

    if (++count == 2) {
        clearInterval(gettingTweets);
    }
}, 1000 * 15);
