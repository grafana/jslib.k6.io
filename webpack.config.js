module.exports = {
  mode: process.env.NODE_ENV || 'production',
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs',
  },
  optimization: {
    minimize: true,
  },
}
