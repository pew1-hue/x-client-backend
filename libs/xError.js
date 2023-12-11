class xError extends Error {
    constructor(message, errorInfo) {
        super(message)
        this.errorInfo = errorInfo
    }
}

export default xError