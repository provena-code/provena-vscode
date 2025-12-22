//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');
const fs = require('fs');
const dotenv = require('dotenv');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

module.exports = (env, argv) => {
  const mode = argv?.mode || 'production';
  console.log('mode', mode);
  const envPath = path.resolve(__dirname, `.env.${mode}`);

  // load key-value pairs from file
  const fileEnv = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};

  // transform to DefinePlugin format
  const defineEnv = {};
  for (const key in fileEnv) {
    defineEnv[`process.env.${key}`] = JSON.stringify(fileEnv[key]);
  }
  console.log('defineEnv', defineEnv);

  /** @type WebpackConfig */
  const extensionConfig = {
    target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2'
    },
    externals: {
      vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
      // modules added here also need to be added in the .vscodeignore file

    },
    resolve: {
      // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, 'tsconfig.extension.json')
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin(defineEnv)
    ],
    devtool: 'nosources-source-map',
    infrastructureLogging: {
      level: "log", // enables logging required for problem matchers
    },
  };

  /** Webview client config */
  const webviewConfig = {
    target: 'web', // webview runs in browser
    mode: 'none',

    entry: './src/webview/index.ts', // entry for your client app
    output: {
      path: path.resolve(__dirname, 'media'),
      filename: 'bundle.js',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, 'tsconfig.webview.json')
              }
            }
          ]
        }
      ]
    },
    devtool: 'source-map',
  };

  return [ extensionConfig, webviewConfig ];
};