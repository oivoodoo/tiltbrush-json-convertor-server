module.exports = {
  entry: './index',
  output: {
    filename: 'browser-bundle.js'
  },
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
            presets: [
                'babel-preset-es2015',
                'babel-preset-react',
                'babel-preset-stage-0',
            ].map(require.resolve),
        }
      },
    ]
  }
};
