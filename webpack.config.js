const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack')

const mode = process.env.WEBPACK_SERVE ? 'development' : 'production'
const config = {
  mode,
  entry: {
    app: './src/index.js'
  },
  // devtool: 'inline-source-map',
  serve: {
    content: './dist',
    open: true,
    port: 8888
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader'
      },
      // { test: /\.glsl$/, loader: 'ignore-loader' }
    ]
  },
  plugins: [
    // new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      title: 'Development',
      template: 'index.html',
      minify: true
    }),
    // new webpack.IgnorePlugin(/\.glsl$/)
  ],
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: {
            drop_console: true,
            ecma: 6
          }
        }
      })
    ]
  }
}
if (mode === 'production') {
  config.externals = {
    three: 'THREE'
  }
}
module.exports = config
