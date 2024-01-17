import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// this is for setting the type and limit so that we only get json of size 16KB
app.use(express.json({ limit: '16kb' }))
// this so that express understand the url like + % 20 and extended true we can give nested objects
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
// this helps us to store img or pdf's  or public assets on the server
app.use(express.static("public"))

app.use(cookieParser())


export { app }