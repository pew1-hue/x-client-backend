import Redis from 'ioredis'
import config from '../configs/index.js'
import { logger } from './modules.js'

// console.log(config)
let redisConnectionInfo = {
    host: config.redisDB.host,
    port: config.redisDB.port, // MemoryDB 포트
}

// password and tls
if(config.redisDB.password) redisConnectionInfo.password = config.redisDB.password
if(config.redisDB.tls) redisConnectionInfo.tls = config.redisDB.tls

// console.log(redisConnectionInfo)

// Create Redis client instance
// Redis 클라이언트 인스턴스 생성
const redisClient = new Redis(redisConnectionInfo)

// Event listener for successful connection
redisClient.on('connect', () => {
    console.log()
    console.log('🔥 RedisDB Server 🔥')
    console.log(`host: ${config.redisDB.host}`)
    console.log(`port: ${config.redisDB.port}`)
})

redisClient.on('error', (err) => {
    console.log('Database Connection Failed! Bad Config: ', err)
    logger.error('Database Connection Failed! Bad Config: ', err)
})

export default redisClient