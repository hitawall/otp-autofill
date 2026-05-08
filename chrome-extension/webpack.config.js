const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      background: './src/background.js',
      content: './src/content.js',
      popup: './src/popup/popup.js',
      options: './src/options/options.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    mode: argv.mode || 'development',
    devtool: isProduction ? false : 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.html$/i,
          loader: 'html-loader'
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/manifest.json', to: 'manifest.json' },
          { from: 'src/popup/popup.html', to: 'popup.html' },
          { from: 'src/options/options.html', to: 'options.html' },
          { from: 'src/icons', to: 'icons' },
          { from: 'src/styles', to: 'styles' }
        ]
      })
    ],
    resolve: {
      extensions: ['.js', '.json']
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    watchOptions: {
      ignored: /node_modules/
    }
  };
};
