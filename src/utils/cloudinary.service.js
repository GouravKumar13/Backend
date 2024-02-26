import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const uploadFileToCloudinary = async (localFilePath) => {
    try {

        if (!localFilePath) return "Could not find the file"
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        //file has been uploaded successfully

        //should only return the url and not the whole response object
        fs.unlinkSync(localFilePath) // to remove the files from the temp folder
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

export { uploadFileToCloudinary }