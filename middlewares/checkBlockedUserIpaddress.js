import { logger, ip } from '../libs/modules.js'
import Tools from '../libs/tools.js'
import xError from '../libs/xError.js'

import etcService from '../services/etcService.js'

const checkBlockedUserIpaddress = async (req, res, next) => {
    const ipaddress = Tools.ipaddress(req)

    // console.log('IP Address:', ip)
    try {
        // check allow ipaddress
        // 차단 된 아이피 확인하기

        // Without transaction
        const rcheckBlockedUserIpaddress = await etcService.checkBlockedUserIpaddress()

        if (rcheckBlockedUserIpaddress.error) {
            throw new xError('check allow ipaddress db error', {
                v: {},
                errorRule: 'db',
                statusCode: 500,

                errorTitle: {
                    en: 'Ipaddress Check Failed',
                    ko: '아이피 체크 실패'
                },
                errorMessage: {
                    en: 'Database error',
                    ko: '데이터 베이스 에러'
                },

                errorTextForLogs: rcheckBlockedUserIpaddress.error
            })
        }

        let isAllowed = false
        for(let range of rcheckBlockedUserIpaddress.data) {
            console.log(rcheckBlockedUserIpaddress.data)
            console.log(ip.cidrSubnet(range.cidr))
            console.log(ipaddress)
            if(ip.cidrSubnet(range.cidr).contains(ipaddress)) {
                isAllowed = true
                break
            }
        }

        if (isAllowed) {
            throw new xError('Access denied error', {
                v: {},
                errorRule: 'Access denied',
                statusCode: 403,

                errorTitle: {
                    en: 'Access denied',
                    ko: '허용되지 않은 접근'
                },
                errorMessage: {
                    en: 'Access denied',
                    ko: '허용되지 않은 접근'
                },

                errorTextForLogs: null
            })
        }

        // send request to next middleware/router handler
        // 다음 미들웨어/라우터 핸들러로 요청을 전달
        next()
    } catch (error) {
        logger.error(error)

        // if xError instance
        // 만약 xError 인스턴스라면
        if(error instanceof xError) {
            const errorInfo = Tools.deepClone(error.errorInfo)
            const errorData = Tools.denyValidate({}, errorInfo.errorRule, errorInfo.statusCode, errorInfo.errorTitle, errorInfo.errorMessage)
            res.status(errorInfo.statusCode).json(errorData)
        }
        // else if general error
        // 그 외 일반 에러라면
        else {
            res.status(500).json({
                statusCode: 500,
                errorTitle: {
                    en: 'Unknown Error',
                    ko: '알 수 없는 에러'
                },
                errorMessage: {
                    en: 'Please contact the administrator.',
                    ko: '관리자에게 문의 하세요.'
                }
            })
        }
    }
}

export default checkBlockedUserIpaddress