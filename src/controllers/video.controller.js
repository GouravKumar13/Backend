import { Video } from "../models/video.model.js";
import { apiError } from "../utils/ApiError.js";
import { apiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFileToCloudinary } from "../utils/cloudinary.service.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const publishVideo = asyncHandler(async (req, res) => {
    /*
    1-get title and description
    2-get video and thumbnail
    3-upload on cloudinary
    4-upload on mongo
    5-return res
    */

    //get title and des
    const { title, description } = req.body //jwt to check if user is logged in or not
    console.log(title);

    if (!title) {
        throw new apiError(400, "title for a video is req")
    }


    // get video and thumbnail
    const videoLocalPath = req.files?.videoFile[0].path
    if (!videoLocalPath) {
        throw new apiError(400, "No video found")
    }

    const thumbnailLocalPath = req.files?.thumbnail[0].path
    if (!thumbnailLocalPath) {
        throw new apiError(400, "No thumbnail found")
    }


    //upload on cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    if (!videoFile) {
        throw new apiError(400, "video not uploaded on cloudinary")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new apiError(400, "thumbnail not uploaded on cloudinary")
    }

    console.log("Video and thumbnail uploaded on cloudinary");

    //getting the user
    const user = await User.findById(req.user?._id)

    //store the data on mongo
    const video = await Video.create({
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.url,
        owner: user._id,
        title: title,
        description: description || "",
        duration: videoFile.duration

    })

    //return the res
    return (
        res
            .status(200)
            .json(new apiResponse(200, video, "Video uploaded successfully"))
    )

})


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query;

    const user = await User.find({
        refreshToken: req.cookies.refreshToken,
    });

    const pageNumber = parseInt(page);
    const limitOfComments = parseInt(limit);

    if (!user) {
        throw new apiError(400, "User is required.");
    }

    const skip = (pageNumber - 1) * limitOfComments;
    const pageSize = limitOfComments;

    const videos = await Video.aggregatePaginate(
        Video.aggregate([
            {
                $match: {
                    $or: [
                        { title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } }
                    ],
                    isPublished: true,
                    owner: user._id
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                }
            },
            {
                $addFields: {
                    likes: { $size: "$likes" }
                }
            },
            {
                $project: {
                    "_id": 1,
                    "videoFile": 1,
                    "thumbnail": 1,
                    "title": 1,
                    "description": 1,
                    "duration": 1,
                    "views": 1,
                    "isPublished": 1,
                    "owner": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "likes": 1
                }
            },
            { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },
            { $skip: skip },
            { $limit: pageSize }
        ])
    );

    if (videos.length === 0) {
        return res.status(200).json(new apiResponse(200, "No videos available."));
    }

    // Return the videos
    res.status(200).json(new apiResponse(200, videos, "Videos fetched successfully"));
});



const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        if (!videoId) {
            throw new apiError(400, "videoId cant be fetched from params")
        }

        const video = await Video.findById(videoId)
        if (!video) {
            throw new apiError(400, "Cant find video")
        }

        return (
            res
                .status(200)
                .json(new apiResponse(200, video, "video fetched successfully"))
        )

    } catch (error) {
        throw new apiError(400, `Internal Error ${error}`)
    }
})


const updateVideoDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new apiError(400, "videoId cant be fetched from params")
    }

    // Only the owner can update the video details
    const video = await Video.findById(videoId)
    if (!video) {
        throw new apiError(404, "Video not found")
    }

    const user = await User.findOne({
        refreshToken: req.cookies.refreshToken,
    })
    if (!user) {
        throw new apiError(404, "User not found")
    }

    if (!video.owner.equals(user._id.toString())) {
        throw new apiError(403, "Only the owner can update video details")
    }

    // Update title and description
    const { title, description } = req.body
    if (!title) {
        throw new apiError(400, "Title is required")
    }
    if (!description) {
        throw new apiError(400, "Description is required")
    }
    video.title = title
    video.description = description

    // Update thumbnail
    const newThumbnailLocalFilePath = req.file?.path
    if (!newThumbnailLocalFilePath) {
        throw new apiError(400, "Thumbnail is not uploaded")
    }
    const thumbnail = await uploadOnCloudinary(newThumbnailLocalFilePath)
    if (!thumbnail) {
        throw new apiError(500, "Failed to upload thumbnail to Cloudinary")
    }
    video.thumbnail = thumbnail.url

    // Save the changes
    await video.save();

    // Return the response
    return res
        .status(200)
        .json(new apiResponse(200, video, "Video details updated successfully"))
})


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new apiError(400, "videoId cant be fetched from params")
    }

    const video = await Video.findById(videoId)
    const user = await User.findOne({
        refreshToken: req.cookies.refreshToken,
    })
    if (!user) {
        throw new apiError(404, "User not found")
    }


    //only the owner can delete the video
    if (video?.owner.equals(user._id.toString())) {
        await Video.findByIdAndDelete(videoId)
        return (
            res
                .status(200)
                .json(new apiResponse(200, {}, "Video deleted successfully"))
        )
    } else {
        throw new apiError(401, "Only user can delete the video")
    }


})


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) {
        throw new apiError(400, "videoId cant be fetched from params")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }
    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false })

    return (
        res
            .status(200)
            .json(new apiResponse(200, video.isPublished, "Video publish toggled successfully"))
    )
})


export {
    publishVideo,
    getAllVideos,
    getVideoById,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus
}