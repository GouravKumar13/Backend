import { Router } from "express";
import {
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateUserAvatar,
    updateUserCoverImage,
    updateUserDetails,
    updateUserPassword
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser)


router.route("/login").post(loginUser)
router.route("/refreshToken").post(refreshAccessToken)

// secure routes
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/updatePassword").post(verifyJwt, updateUserPassword)
router.route("/currentUser").get(verifyJwt, getCurrentUser)
router.route("/editProfile").patch(verifyJwt, updateUserDetails)
router.route("/updateAvatarImage").patch(verifyJwt, upload.single("avatar"), updateUserAvatar)
router.route("/updateCoverImage").patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:userName").get(verifyJwt, getUserChannelProfile)
router.route("/watchHistory").get(verifyJwt, getWatchHistory)



export default router