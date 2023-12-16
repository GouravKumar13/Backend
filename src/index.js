//require('dotenv').config() // this is breaking the consistency of the code
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env"
})


connectDB()

/*
import { Express } from "express";
const app = Express()
    // IIFE
    ; (async () => {
        try {
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
            app.on("error", (err) => {
                console.log("ERROR", err)
                throw err
            })
            app.listen(process.env.PORT, () => {
                console.log(`app is listening on port ${process.env.PORT}`)
            })

        } catch (error) {
            console.error("Error", error)
        }
    })()
    */