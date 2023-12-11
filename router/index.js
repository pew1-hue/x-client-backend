import express from 'express'
import config from '../configs/index.js'
import Auth from '../libs/auth.js'
const routers = express.Router()



import userCtr from '../controllers/userController.js'



routers.get(`/v${config.version}/user/login`, userCtr.login)
routers.post(`/v${config.version}/user`,  userCtr.createUser)
routers.patch(`/v${config.version}/user/:userOID`, Auth.authAndGetInfo, userCtr.updateUser)  

export default routers
