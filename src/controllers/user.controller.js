import { apiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import e from "express";
import { uploadFileToCloudinary } from "../utils/cloudinary.service.js";
import { apiResponse } from "../utils/ApiResponse.js";

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

    const options = {
        httpOnly: true,
        secure: true
    }

    res
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
    const user = await User.findByIdAndUpdate(userId,
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

export { registerUser, loginUser, logoutUser }