import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/ApiError.js";
import { apiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createTweet = asyncHandler(async (req, res) => {
    /*
    1-get content, link with user
    2-store on mongo
    3-return res
    */

    //get content and user
    const { content } = req.body
    const user = await User.findById(req.user?._id)

    if (!content) {
        throw new apiError(400, "Content is required")
    }
    if (!user) {
        throw new apiError(400, "Cannot fetch user")
    }

    //storing the data on mongo
    const tweet = await Tweet.create({
        owner: user._id,
        content: content
    })

    //returning the response
    return (
        res
            .status(200)
            .json(new apiResponse(200, tweet, "Tweet created successfully"))
    )

})

const getUserTweets = asyncHandler(async (req, res) => {
    // Get the user ID
    const { userId } = req.params;
    if (!userId) {
        throw new apiError(400, "user Id cant be found from params")
    }

    // Query the Tweet collection to find all tweets by the user
    const userTweets = await Tweet.find({ owner: userId });

    // Return res
    return (
        res
            .status(200)
            .json(new apiResponse(200, userTweets, "Tweets fetched successfully"))
    )
});


const updateTweet = asyncHandler(async (req, res) => {

    //getting tweetID and content
    const { tweetId } = req.params
    if (!tweetId) {
        throw new apiError(400, "tweet Id cant be fetched from params")
    }

    //only the owner can update the tweet
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new apiError(400, "Cant find Tweet")
    }


    const user = await User.findOne({
        refreshToken: req.cookies.refreshToken,
    })
    if (!user) {
        throw new apiError(404, "User not found")
    }

    if (tweet?.owner.equals(user._id.toString())) {

        const { content } = req.body

        if (!content) {
            throw new apiError(400, "Please provide content to update")
        }

        tweet.content = content
        await tweet.save({ validateBeforeSave: false })

        return (
            res
                .status(200)
                .json(new apiResponse(200, tweet, "tweet updated successfully"))
        )

    } else {
        throw new apiError(400, "Only the owner can update the tweet")
    }
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    if (!tweetId) {
        throw new apiError(400, "Tweet id cant be fetched for params")
    }
    const tweet = await Tweet.findById(tweetId)
    const user = await User.findOne({
        refreshToken: req.cookies.refreshToken,
    })
    if (!user) {
        throw new apiError(404, "User not found")
    }


    //only the owner can delete the tweet
    if (tweet?.owner.equals(user._id.toString())) {
        await Tweet.findByIdAndDelete(tweetId)
        return (
            res
                .status(200)
                .json(new apiResponse(200, {}, "Tweet deleted successfully"))
        )
    } else {
        throw new apiError(401, "Only user can delete the tweet")
    }

})




export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}