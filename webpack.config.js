const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

let distDir = path.resolve(__dirname, 'dist');

module.exports = {
    entry: {
        jsx: './src/index.tsx',
    },
    output: {
        path: distDir,
        filename: 'index.js',
        publicPath: './',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: [
                    'babel-loader?presets[]=env',
                    'ts-loader'
                ],
            },
        ],
    },
    devServer: {
        publicPath: '/',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'public/index.html'
        }),
        new CopyWebpackPlugin([
            {from: 'public/*gz*'}
        ])
    ],
    node: {
        child_process: 'empty',
        readline: 'empty',
    },
    devtool: 'source-map'
}

