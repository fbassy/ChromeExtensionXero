const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

require('dotenv').config();

// Unique per build so you can confirm the latest code is running
const BUILD_VERSION = new Date().toISOString();

// Secrets from .env (never commit .env; use .env.example as a template)
const env = (key, def = '') => (process.env[key] != null && process.env[key] !== '' ? process.env[key] : def);

module.exports = {
  entry: {
    background: './src/background/background.js',
    'gmail-detector': './src/content/gmail-detector.js',
    sidepanel: './src/sidepanel/sidepanel.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        type: 'javascript/auto',
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
      __XERO_CLIENT_ID__: JSON.stringify(env('XERO_CLIENT_ID')),
      __GA4_MEASUREMENT_ID__: JSON.stringify(env('GA4_MEASUREMENT_ID')),
      __GA4_API_SECRET__: JSON.stringify(env('GA4_API_SECRET')),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform: (content) => {
            const json = content.toString().replace(
              '"__GOOGLE_OAUTH_CLIENT_ID__"',
              JSON.stringify(env('GOOGLE_OAUTH_CLIENT_ID'))
            );
            return json;
          },
        },
        { from: 'src/sidepanel/sidepanel.html', to: 'sidepanel.html' },
        { from: 'src/sidepanel/sidepanel.css', to: 'sidepanel.css' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
};
