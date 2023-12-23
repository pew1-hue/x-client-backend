
import cloneDeep from 'lodash/cloneDeep.js'
import mobileDetect from 'mobile-detect'

class Tools {
    static deepClone(v) {
        return cloneDeep(v)
    }

    static ipaddress(req) {
        let ip = req.headers['cf-connecting-ip']

        if(!ip && typeof req.socket.remoteAddress === 'string') {
            ip = req.socket.remoteAddress.split(":").pop()
        }

        return ip || ''
    }

    static left(v, length) {
        if(!v || !length) return ''

        if(v.length <= length) {
            return v
        } else {
            return v.substring(0, length)
        }
    }

    static right(v, length) {
        if(!v || !length) return ''

        if(v.length <= length) {
            return v
        } else {
            return v.substring(v.length - length)
        }
    }

    static generateReqValue(v, req) {
        const arrayNeedNumber = ['number', 'gte', 'lte', 'gt', 'lt', 'outputNumber']
        const arrayNeedBoolean = ['boolean']
        const arrayOutputString = ['outputString']
        const arrayTrimUrl = ['trimUrl']

        for (let vv in v) {
            const rules = Object.keys(v[vv].rule)

            let needNumber = false
            for (let i = 0; i < arrayNeedNumber.length; i++) {
                if(rules.indexOf(arrayNeedNumber[i]) > -1) {
                    needNumber = true
                    break
                }
            }

            let needBoolean = false
            for (let i = 0; i < arrayNeedBoolean.length; i++) {
                if(rules.indexOf(arrayNeedBoolean[i]) > -1) {
                    needBoolean = true
                    break
                }
            }

            let needTrim = false
            for (let i = 0; i < arrayTrimUrl.length; i++) {
                //if value of rule is true then continue
                if(v[vv].rule[arrayTrimUrl[i]]) {
                    if(rules.indexOf(arrayTrimUrl[i]) > -1) {
                        needTrim = true
                        break
                    }
                }
            }
            
        
            let outputString = false
            for (let i = 0; i < arrayOutputString.length; i++) {
                if(rules.indexOf(arrayOutputString[i]) > -1) {
                    outputString = true
                    break
                }
            }

            if(outputString) {
                v[vv] = v[vv].value
            } else {
                if(needNumber) {
                    v[vv] = Number(v[vv].value)
                }
                else if(needBoolean) {
                    v[vv] = JSON.parse(v[vv].value)
                }
                else if(needTrim){
                    v[vv] = v[vv].value.replace(/(https?:\/\/)|(www\.)/g, '')
                }
                else {
                    v[vv] = v[vv].value
                }
            }
        }

        const md = new mobileDetect(req.headers['user-agent'] || '')

        v.ipaddress = this.ipaddress(req)
        v.host = req.headers.host?.replace('www.', '')
        v.decoded = req.decoded || null
        v.token = req.token || null
        v.dToken = req.dToken
        v.device = md.mobile() ? 'mobile' : 'pc'
        v.phone = md.phone() ? md.phone() : ''

        return v
    }

    static denyValidate(data, rule, statusCode, title, message) {
        data.firstError = {
            field: 'custom',
            rule: rule
        }

        if(data.validates === undefined) {
            data.validates = {}
        }

        data.validates.custom = {
            value: '',
            rule: {
                [rule]: true
            },
            message: {
                [rule]: {
                    en: message.en,
                    ko: message.ko
                }
            },
            validate: {
                passValidates: {
                    [rule]: false
                },
                validateAllPass: false
            }
        }
        data.allPass = false,

        data.statusCode = statusCode

        data.errorTitle = {
            en: `${title.en} - ${statusCode}`,
            ko: `${title.ko} - ${statusCode}`
        }

        return data
    }
}

export default Tools