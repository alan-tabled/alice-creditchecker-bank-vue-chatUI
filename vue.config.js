require('dotenv').config();

const path = require('path');
const webpack = require('webpack')

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

const { defineConfig } = require('@vue/cli-service')
// vue.config.js

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new NodePolyfillPlugin(),
      new webpack.DefinePlugin({
        
      }),
    ]
  },
})
