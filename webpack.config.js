import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import CopyWebpackPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";

const __dirname = dirname(fileURLToPath(import.meta.url));

const copyStatics = {
  patterns: [
    { from: "manifest.json", context: resolve("./"), to: resolve("dist") },
    { from: "icons", context: resolve("./"), to: resolve("dist/icons") },
  ],
};

export default {
  entry: "./src/index.js",
  output: {
    path: resolve("dist"),
    filename: "bundle.js",
    publicPath: "dist/",
    clean: true,
  },
  externals: {
    photoshop: "commonjs2 photoshop",
    uxp: "commonjs2 uxp",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
      filename: "index.html",
    }),
    new CopyWebpackPlugin(copyStatics),
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: { loader: "babel-loader" },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"],
  },
  devtool: "eval-cheap-source-map",
};
