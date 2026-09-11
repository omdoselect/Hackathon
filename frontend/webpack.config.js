const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: { path: path.resolve(__dirname, "dist"), filename: "bundle.js", publicPath: "/" },
  module: {
    rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: "babel-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      { test: /\.json$/, type: "json" },
      { test: /\.(png|jpe?g|gif|svg|webp)$/i, type: "asset/resource" },
    ],
  },
  resolve: { extensions: [".js", ".jsx"] },
  plugins: [new HtmlWebpackPlugin({ template: "./public/index.html" })],
  devServer: { historyApiFallback: true, port: 3000 },
};
