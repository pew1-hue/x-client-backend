// ### 모듈 정의 ###
import express from 'express'
import cors from 'cors'
import http from 'http'
import mongoSanitize from 'express-mongo-sanitize'
import config from './configs/index.js'
import { DB } from './libs/db.js'
import RDB from './libs/redisDB.js'

// import checkBlockedUserIpaddress from './middlewares/checkBlockedUserIpaddress.js'

// ### express ###
const app = express()
app.set('trust proxy', true)

// ### 미들웨어 사용 ###
app.use(cors({
    // origin: ['https://icon-cjs.pages.dev']
    origin: '*',
    exposedHeaders: ['x-access-token', 'x-access-dtoken']
}))
app.use(express.json({
    limit: '2mb'
}))
app.use(express.urlencoded({ extended: true }))
app.use(mongoSanitize())
// app.use(checkBlockedUserIpaddress)


// ### 라우터 정의 ###
import apiRouter from './router/index.js'
app.use('/', apiRouter)

const server = http.createServer(app)
const port = config.port
{
    (async () => {
        await DB.connect()

        server.listen(port, '127.0.0.1', () => {
            console.log()
            console.log(`Express Server `)
            console.log(`port: ${port}`)
            console.log(`siteCode: ${config.siteCode}`)
        })

    })()
}