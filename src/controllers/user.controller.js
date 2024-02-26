import { apiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import e from "express";
import { uploadFileToCloudinary } from "../utils/cloudinary.service.js";
import { apiResponse } from "../utils/ApiResponse.js";

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

export { registerUser }