//require('dotenv').config() // this is breaking the consistency of the code
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env"
})


connectDB()
    .then(() => {
        app.on("error", (err) => {
            console.log("Error: ", err)
            throw err
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running on port:${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.error("mongo db connection failed", err)
    })

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