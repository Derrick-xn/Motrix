'use strict'

process.env.BABEL_ENV = 'renderer'

const path = require('node:path')
const Webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')

const devMode = process.env.NODE_ENV !== 'production'

let mobileConfig = {
  entry: {
    index: path.join(__dirname, '../src/mobile/main.js')
  },
  externals: [],
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              additionalData: '@import "@/components/Theme/Variables.scss";',
              sassOptions: {
                includePaths: [__dirname, 'src']
              }
            }
          }
        ]
      },
      {
        test: /\.sass$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              indentedSyntax: true,
              additionalData: '@import "@/components/Theme/Variables.scss";',
              sassOptions: {
                includePaths: [__dirname, 'src']
              }
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            extractCSS: process.env.NODE_ENV === 'production',
            loaders: {
              sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax=1',
              scss: 'vue-style-loader!css-loader!sass-loader',
              less: 'vue-style-loader!css-loader!less-loader'
            }
          }
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        type: 'asset/inline'
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        type: 'asset/resource'
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset/inline'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    }),
    new HtmlWebpackPlugin({
      title: 'Motrix',
      filename: 'index.html',
      chunks: ['index'],
      template: path.resolve(__dirname, '../src/mobile/index.ejs'),
      isBrowser: true,
      isDev: devMode,
      nodeModules: false
    }),
    new Webpack.HotModuleReplacementPlugin(),
    new Webpack.NoEmitOnErrorsPlugin(),
    new Webpack.DefinePlugin({
      'process.env.IS_MOBILE': 'true',
      'process.env.PORTABLE_EXECUTABLE_DIR': '""'
    }),
    {
      apply (compiler) {
        compiler.hooks.normalModuleFactory.tap('StripNodeScheme', (nmf) => {
          nmf.hooks.beforeResolve.tap('StripNodeScheme', (resolveData) => {
            if (resolveData.request.startsWith('node:')) {
              resolveData.request = resolveData.request.slice(5)
            }
          })
        })
      }
    }
  ],
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../dist/mobile'),
    globalObject: 'this',
    publicPath: ''
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '../src/renderer'),
      '@shared': path.join(__dirname, '../src/shared'),
      '@mobile': path.join(__dirname, '../src/mobile'),
      'vue$': 'vue/dist/vue.esm.js',
      'electron-is$': path.join(__dirname, '../src/mobile/platform/electron-shim.js'),
      'electron$': path.join(__dirname, '../src/mobile/platform/electron-shim.js'),
      '@electron/remote$': path.join(__dirname, '../src/mobile/platform/electron-shim.js'),
      '@electron/remote': path.join(__dirname, '../src/mobile/platform/electron-shim.js'),
      'node-fetch$': path.join(__dirname, '../src/mobile/platform/fetch-shim.js'),
      'ws$': path.join(__dirname, '../src/mobile/platform/ws-shim.js'),
      'vue-electron$': path.join(__dirname, '../src/mobile/platform/electron-shim.js')
    },
    extensions: ['.js', '.vue', '.json', '.css'],
    fallback: {
      path: path.join(__dirname, '../src/mobile/platform/path-shim.js'),
      fs: false,
      events: require.resolve('events/'),
      buffer: require.resolve('buffer/'),
      stream: false,
      util: false,
      os: false,
      crypto: false
    }
  },
  target: 'web',
  optimization: {
    minimize: !devMode,
    minimizer: [
      new TerserPlugin({ extractComments: false }),
      new CssMinimizerPlugin()
    ]
  }
}

if (devMode) {
  mobileConfig.devtool = 'eval-cheap-module-source-map'
  mobileConfig.plugins.push(
    new Webpack.DefinePlugin({
      '__static': `"${path.join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
    })
  )
  mobileConfig.devServer = {
    hot: true,
    port: 9081,
    static: {
      directory: path.join(__dirname, '../static')
    }
  }
}

if (!devMode) {
  mobileConfig.plugins.push(
    new CopyWebpackPlugin({
      patterns: [{
        from: path.join(__dirname, '../static'),
        to: path.join(__dirname, '../dist/mobile/static'),
        globOptions: { ignore: ['.*'] }
      }]
    }),
    new Webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new Webpack.LoaderOptionsPlugin({
      minimize: false
    })
  )
}

module.exports = mobileConfig
