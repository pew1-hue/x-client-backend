module.exports = {
    apps: [
        {
            name: "[X-CLIENT-BACK]X",
            script: "./app.js",
            env: {
                "PORT": 3002,
                "NODE_ENV": "development"
            },
            env_production: {
                "PORT": 3002,
                "NODE_ENV": "production"
            }

        }
    ],
    port: 3002,
    version: '0.0.0',
    versionKey: 'version'
}