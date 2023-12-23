import Validate from '../libs/validate.js'
import Tools from '../libs/tools.js'
import { DB, ObjectId } from '../libs/db.js'

let collection = 'domains'

const domainService = {
    getDomain(
        domain
    ) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                let findQuery = {
                    domain
                }
                
                const whatQuery = {
                    projection: {
                        siteOID: 1,
                        domain: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }

                const pool = await DB.connect()
                r.data = await pool.collection(collection).find(findQuery, whatQuery).toArray()

                resolve(r)
            } catch (err) {
                r.error = err
                resolve(r)
            }
        })
    }
}

export default domainService