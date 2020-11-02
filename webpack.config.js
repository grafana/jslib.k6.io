module.exports = {
  mode: process.env.NODE_ENV || 'production',
  output: {
    // path: path.resolve(__dirname),
    filename: 'index.js',
    libraryTarget: 'commonjs',
  },
  optimization: {
    minimize: true,
  },
  // No babel
  // module: {
  //   rules: [
  //     {
  //       test: /\.(js|jsx)$/,
  //       exclude: /node_modules/,
  //       use: {
  //         loader: "babel-loader",
  //       },
  //     },
  //   ],
  // },
}
