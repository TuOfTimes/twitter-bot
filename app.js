var Twitter = require("twitter");
var config = require("./config.js");

var T = new Twitter(config);

var params = {
    q: "#giveawayalert",
    count: 100,
    result_type: "mixed",
    lang: "en",
};

/*
    GET search/tweets rate limit: 180 per 15 min
    POST statuses/* rate limit: 300 per 3 hours

    Tweets can be viewed by their 'id_str' by visiting 'twitter.com/anyuser/status/{id_str}'

    Giveaway post are not responses - ignore tweet if it is a response (ie. 'in_reply_to_status_id_str') is not null

    If tweet starts with 'RT @{name}:' then ignore as well
    Assuming each giveaway requires 3 interactions (favorite, retweet, follow - called friendship in the API) we can do 16 per hour
*/

T.get("search/tweets", params, function (err, data, response) {
    if (!err) {
        console.log(`Query returned ${data.statuses.length} tweets`);
        var count = 0;
        for (let i = 0; i < data.statuses.length; i++) {
            if (count == 100) {
                break;
            }

            // interact with tweet if it is actually a giveaway
            if (
                data.statuses[i].in_reply_to_status_id_str == null &&
                !data.statuses[i].text.startsWith("RT @") &&
                !data.statuses[i].retweeted
            ) {
                count++;

                // favorite
                T.post(
                    "favorites/create",
                    { id: data.statuses[i].id_str },
                    function (err, response) {
                        if (err) {
                            console.log(err[0].message);
                        } else {
                            console.log(
                                "Favorited: ",
                                `https://twitter.com/anyuser/status/${response.id_str}`
                            );
                        }
                    }
                );

                // retweet
                T.post("statuses/retweet/" + data.statuses[i].id_str, function (
                    err,
                    tweet,
                    response
                ) {
                    if (err) {
                        console.log(err[0].message);
                    } else {
                        console.log(
                            "Retweeted: ",
                            `https://twitter.com/anyuser/status/${response.id_str}`
                        );
                    }
                });

                // follow
                T.post(
                    "friendships/create",
                    {
                        screen_name: data.statuses[i].user.screen_name,
                        user_id: data.statuses[i].user.id_str,
                        follow: true,
                    },
                    function (err, response) {
                        if (err) {
                            console.log(err[0].message);
                        } else {
                            console.log(
                                "Followed: ",
                                `${response.screen_name}`
                            );
                        }
                    }
                );

                // comment
                T.post(
                    "statuses/update",
                    {
                        status: "@GiveawayBot14 Check this out",
                        in_reply_to_status_id_str: data.statuses[i].id_str,
                        auto_populate_reply_metadata: true,
                    },
                    function (err, tweet, response) {
                        if (err) {
                            console.log(err[0].message);
                        } else {
                            console.log(
                                "Commented: ",
                                `https://twitter.com/anyuser/status/${response.id_str}`
                            );
                        }
                    }
                );
            }
        }
        console.log(count);
    } else {
        console.log(err);
    }
});
