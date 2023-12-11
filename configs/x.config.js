// X
const redisDB = {
    production: {
        host: '',
        port: 6379,
        tls: true
    },
    development: {
        host: '52.192.232.45',
        port: 6379,
        password: 'X#4860',
        tls: false
    }
}
const config = {
    siteCode: 'x',
    port: 3002,
    version: 1,
    db: {
        host: 'results.f4ctc.mongodb.net',
        port: 27017,
        name: 'x',
        id: 'x',
        password: 'X#4860',
        transactionOptions: {
            readPreference: 'primary',
            readConcern: { level: 'majority' },
            writeConcern: { w: 'majority' }
        },
    },
    redisDB: redisDB[process.env.NODE_ENV || 'development'],
    jwtSecret: '93To!@#$%87^&*()021Es654ta365!To',
    allowDuplicateLogin: false,
    expiresIn: 60 * 60 * 24, // 1day
    expiresInFordToken:  60 * 60 * 24 * 7 // 7days

}

export default config