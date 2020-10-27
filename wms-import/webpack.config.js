const path = require('path');
const nodeExternals = require('webpack-node-externals');
module.exports = {
    target: "node",
    entry: {
        app: ["./lib/import.js"]
    },
    output: {
        path: path.resolve(__dirname, "build"),
        filename: "buhta-import.js"
    },
    //externals: [nodeExternals()],
};
