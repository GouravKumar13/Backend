import { apiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { uploadFileToCloudinary } from "../utils/cloudinary.service.js";
import { apiResponse } from "../utils/ApiResponse.js";
import { response } from "express";
import mongoose from "mongoose";


const options = {
    httpOnly: true,
    secure: true
}


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        // if (!user) throw new apiError("User not found")
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }


    } catch (error) {
        throw new apiError(500, "something went wrong while generating access and refresh tokens")
    }

}



const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    // validation -not empty
    // check if user is already exist -- userName ,email
    //check for images ,check for avatar
    // upload them to cloudinary ,avatar
    //create user object -create entry in db
    // remove password and refresh token field from response
    //check for user creation
    // return response

    const { userName, email, fullName, password } = req.body
    if ([userName, email, fullName, password].some((value) => { return value?.trim() === "" })) {
        throw new apiError(400, "please check your input", [userName, email, fullName, password],)
    }
    console.log("body", req.body)
    console.log("files", req.files)
    //find email or username in the db
    const existedUser = await User.findOne({
        $or: [
            { userName },
            { email }
        ]
    })
    if (existedUser) {
        throw new apiError(409, "UserName or email is already in use", [userName, email])
    }
    console.log(req.files)
    const avatarLocalPath = req?.files?.avatar ? req?.files?.avatar[0]?.path : null
    const coverImageLocalPath = req?.files?.coverImage ? req?.files?.coverImage[0]?.path : null
    if (!avatarLocalPath) {
        throw new apiError(400, "avatar file is required")

    }

    const avatar = await uploadFileToCloudinary(avatarLocalPath)
    const coverImage = await uploadFileToCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        userName: userName.toLowerCase(),
        email,
        password
    })
    //removing password and refresh token from the user and sending it as response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new apiError(500, "User creation failed")
    }

    return res.status(201).json(new apiResponse(200, createdUser, "user created successfully "))
})

const loginUser = asyncHandler(async (req, res) => {
    //req.body -> data
    //username or email
    //find the user
    // password check
    // generate access token and refresh token
    // send cookies
    // send response

    const { userName, email, password } = req.body
    console.log(email)
    if (!userName && !email) {
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({ $or: [{ userName }, { email }] })

    if (!user) {
        throw new apiError(404, "user is not registered")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new apiError(401, "INvalid user Credentials")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")



    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new apiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "user logged In successfully"))
    // we are sending the refresh and access token as a json response so the user can handle it as the want such as setting it to the local storage or if developing a mobile application the cookies will not be set so the the user can user the access token or refresh token him self

})

const logoutUser = asyncHandler(async (req, res) => {
    // clear cookies
    //reset refresh token
    const userId = req.user._id
    await User.findByIdAndUpdate(userId,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "user logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new apiError(401, "unAuthorized request")
    }
    try {

        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        if (!decodedToken) {
            throw new apiError(401, "invalid refresh token")
        }

        const user = await User.findById(decodedToken?._id)
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new apiError(401, "refresh token is expired or user")
        }


        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new apiResponse(200, { accessToken: accessToken, refreshToken: newRefreshToken }, "Access Token Refreshed"))

    } catch (error) {
        throw new apiError(401, error.message || "invalid refresh token")
    }

})

const updateUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new apiError(400, "invalid old password")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new apiResponse(200, {}, "Password updated successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new apiResponse(200, req.user, "current user fetched successfully"))
})


// for updating user images like avatar or coverImage user a separate controller so that is the user only changes the image and not the text fields the text are not send again
const updateUserDetails = asyncHandler(async (req, res) => {
    // also add changing username and add limiting so that user can change user name only 5 time  only
    const { fullName, email } = req.body
    const user = await User.findById(req.user?._id)
    if (fullName) user.fullName = fullName
    if (email) user.email = email
    const newUser = await user.save({ validateBeforeSave: false })
    // let user
    // if (fullName || email) {

    //     user = await User.findByIdAndUpdate(req.user?._id, { $set: { fullName, email } }, { new: true }).select("-password")
    // }

    return res
        .status(200)
        .json(new apiResponse(200, { user: newUser }, "account updated successfully"))



})

const updateUserAvatar = asyncHandler(async (req, res) => {
    console.log(req.file.path)
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar image not provided")
    }
    console.log("avatar local path :", avatarLocalPath)

    const avatar = await uploadFileToCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new apiError(400, "Error while uploading avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatar.url } }, { new: true }).select("-password")
    return res.status(200).json(new apiResponse(200, user, "Avatar updated successfully"))

})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new apiError(400, "cover image not provided")
    }

    const coverImage = await uploadFileToCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new apiError(400, "Error while uploading cover Image")
    }
    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { coverImage: coverImage.url } }, { new: true }).select("-password")
    return res.status(200).json(new apiResponse(200, user, "Cover Image updated successfully"))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params
    if (!userName?.trim()) {
        throw new apiError(400, "userName is missing")
    }

    const channel = await User.aggregate([
        {
            $match: { userName: userName?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "Subscribers"
            }

        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "SubscribedTo"
            }
        },

        {
            $addFields: {
                subscribersCount: { $size: "$Subscribers" },
                subscribersCount: { $size: "$SubscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$Subscribers.subscribers"] },
                        then: true,
                        else: false
                    }
                }
            }

        },

        {
            $project: {
                userName: 1,
                fullName: 1,
                avatar: 1,
                coverImages: 1,
                subscribersCount: 1,
                subscribersCount: 1,
                isSubscribed: 1

            }
        }

    ])
    console.log(channel)

    if (!channel) {
        throw new apiError(404, "Channel not found")
    }

    return res.status(200).json(new apiResponse(200, channel[0], "channel details fetched successfully"))

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]

                        }
                    }
                    ,
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    }

                ]

            }
        }
    ])

    return res.status(200).json(new apiResponse(200, user[0].watchHistory, "watch history fetched successfully"))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, updateUserPassword, getCurrentUser, updateUserAvatar, updateUserDetails, updateUserCoverImage, getUserChannelProfile, getWatchHistory }