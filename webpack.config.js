const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');


module.exports = env => {

    console.log("starting");
    console.log("env.mode = " + env.mode);
    const devmode = env.mode != 'production';

    if (devmode) {
        console.log("got devmode")
    }
    else {
        console.log("got production mode")
    }

    let result = {
        entry: {
            main_app: './static/js/main_app.js',
            library_home_react: './static/js/library_home_react.js',
            repository_home_react: './static/js/repository_home_react.js',
            admin_home_react: "./static/js/admin_home_react.js",
            register_react: './static/js/register_react.js',
            duplicate_user_react: './static/js/duplicate_user_react.js',
            account_react: './static/js/account_react.js',
            auth_react: './static/js/auth_react.js'
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[id].css',
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.(sa|sc|c)ss$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        'postcss-loader',
                        'sass-loader'
                    ],
                },
                {
                    test: /\.(eot|ttf|woff|woff2|svg|png|gif|jpe?g)$/,
                    loader: require.resolve("file-loader"),
                },
            ],
        },
    };
    if (!devmode) {
        result.mode = "production";
        result.optimization = {
            minimizer: [new TerserJSPlugin({extractComments: false,}), new OptimizeCSSAssetsPlugin({})],
        };
        result.output = {
            filename: '[name].production.bundle.js',
            path: path.resolve(__dirname, 'static/boxerjs_dist')
        }
    }
    else {
        result.mode = "development";
        result.output = {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'static/boxerjs_dev')
        }
    }
    return result
};

