# Twitter Giveaway Bot

## Description

This bot searches for giveaways being shared on Twitter and interacts with them. It sticks to giveaways being held strictly on Twitter, and will not enter giveaways on third party websites.

## Identifying Giveaways

If we assume that there are more giveaways posted every day than the number of interactions allowed by the Twitter API, then this is a numbers game. We don't need to identify every single giveaway, we just need to identify enough giveaways to maximize our participation. Thus we are more concerned with false positives than false negatives.

To identify giveaways, I used the `search/tweets` endpoint in the Twitter API to find tweets that could be giveaways. The query I used was `(giveaway OR win) (retweet OR RT)`. To further optimize the process, I included a `since_id` value in my search to minimize redundant tweets. Each tweet is assigned an `id`, which is a number used to uniquely identify tweets, with larger numbers indicating more recent tweets. When searching tweets, the `search_metadata` that is returned contains a `max_id` field, which indicates the most recent tweet that was returned. I use this as the `since_id` parameter of my next search.

The results included many tweets that were in response to giveaways (ex. someone was retweeting to participate in a giveaway) or were links to external giveaways. I used simple regex analysis to filter out these results and maximize the number of meaningful interactions.

## Entering Giveaways

Most giveaways held on Twitter require several steps to partcipate, including but not limited to:

-   Following
    -   keywords: follow
    -   API endpoint: `friendships/create`
-   Favoriting
    -   keywords: like, favorite, favourite
    -   API endpoint: `favorites/create`
-   Retweeting
    -   keywords: RT, retweet, share
    -   API endpoint: `statuses/retweet/{tweet_id}`
-   Commenting
    -   keywords: comment, tag
    -   API endpoint: `statuses/udpate`

The first three points - follow, favorite, retweet - are common and straightforward because they are direct actions. The last point - comment - can be more complicated because they involve a message: sometimes giveaways ask that one comment something specific (ex. an answer to some question) or tag another user.e For simplicity, we stick to tagging one of my friends in every post.

## Rate Limits

Since we are using the free version of the Twitter API, there are limits to the number of interactions we can perform in a given time frame. These limits are as follows:

| Request Type | Endpoint           | Number of Hits Per Time Frame | Time Frame |
| ------------ | ------------------ | ----------------------------- | ---------- |
| POST         | statuses/\*        | 300                           | 3 hours    |
| POST         | favorites/create   | 1000                          | 24 hours   |
| POST         | friendships/create | 400                           | 24 hours   |
| GET          | search/tweets      | 180                           | 15 min     |

Assuming that each giveaway entry requires a favorite, follow, retweet, and a comment, then that equates to hitting `statuses/*` twice, `favorites/create` once, and `friendships/create` once per entry. Thus we are limited to 400 entries per 24 hours, as `friendships/create` is the rate-limiting endpoint. Based on these numbers, I decided to have the bot attempt to enter 100 giveaways every 6 hours.

## Challenges

The first time I ran my bot I started it around midnight and set it to retrieve 100 tweets every minute. The bot operated as expected for 105 minutes and made 105 GET requests, successfully retrieving 10400 unique tweets and interacting with 57 of those tweets. The 104th GET request resulted in the following error:

    Error: getaddrinfo ENOTFOUND api.twitter.com at GetAddrInfoReqWrap.onlookup [as oncomplete](dns.js:60:26) { errno: 'ENOTFOUND', code: 'ENOTFOUND', syscall: 'getaddrinfo', hostname: 'api.twitter.com' }

On the 106th and subsequent GET requests the bot started receiving the following error:

    [ { code: 32, message: 'Could not authenticate you.' } ]

Upon logging in to my Twitter account on the computer I was informed that my account had been suspended. In the future I will have to tweek the rate at which requests are made to avoid having my account suspended.

## To Do

-   [x] Track data for visualization
-   [x] Search tweets and interact with tweets separately
-   [x] Analyze text for giveaway entry instructions and perform each action separately (create keywords for each action to match)
-   [x] Create a blacklist of users or screen names to ignore (ex. Bot Spotting)
-   [x] Don't interact with users under a certain number of followers (say 50 followers)
-   [x] Ignore tweets that quote other tweets
-   [x] Use regex to check word matchings
-   [ ] Retrieve followers and to allow for unfollowing once follower limit is reached
-   [x] Put a date requirement on tweets (no earlier than 1 week or something)
-   [ ] Filter out Royale High, Roblox, and Animal Crossing
-   [ ] Ignore posts with external URLs
-   [ ] Determine best way to order giveaway tweets
-   [ ] Fix regex to make sure words are matched properly
-   [ ] Tweek entity checking (ex. URLs, number of tagged users, hashtags, etc.)
