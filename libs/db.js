import { MongoClient, ObjectId } from 'mongodb'
import config from '../configs/index.js'

// Database Name
const dbHost = config.db.host
const dbName = config.db.name
const dbUser = encodeURIComponent(config.db.id)
const dbPassword = encodeURIComponent(config.db.password)

const uri = `mongodb+srv://${dbUser}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`
// console.log(uri)

const client = new MongoClient(uri)

let pool = null
const DB = {
    connect: () => new Promise(async (resolve, reject) => {
        if(pool) {
            resolve(pool)
            return
        }

        try {
            await client.connect()
            pool = client.db(dbName)

            console.log()
            console.log('MongoDB Server')
            console.log(`host': ${dbHost}`)
            console.log(`db: ${dbName}`)

            resolve(pool)

        } catch (error) {
            console.log('Database Connection Failed! Bad Config: ', err)
            pool = null
            resolve(pool)
            return
        }
    }),
}

export { DB, ObjectId }