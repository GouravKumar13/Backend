import { User } from "../models/user.model.js";
import { apiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new apiError(401, "unauthorized request")
        }
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log(decodedToken)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            //comment
            throw new apiError(401, "invalid access token")
        }
        req.user = user
        next()
    } catch (error) {
        throw new apiError(401, error.message || "invalid access token")
    }



})