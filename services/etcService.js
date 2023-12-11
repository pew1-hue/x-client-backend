import Validate from '../libs/validate.js'
import Tools from '../libs/tools.js'
import { DB, ObjectId } from '../libs/db.js'

const etcService = {
    checkBlockedUserIpaddress() {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const findQuery = {}
                const whatQuery = {
                    projection: {
                        cidr: 1
                    }
                }

                const pool = await DB.connect()
                r.data = await pool.collection('blockedUserIpaddress').find(findQuery, whatQuery).toArray()

                resolve(r)
            } catch (err) {
                r.error = err
                resolve(r)
            }
        })
    }
}

export default etcService