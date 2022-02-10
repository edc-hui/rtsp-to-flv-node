const ffmpegPath = require('@ffmpeg-installer/ffmpeg'); // 自动为当前node服务所在的系统安装ffmpeg
const ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const webSocketStream = require("websocket-stream/stream");
const expressWebSocket = require("express-ws");

ffmpeg.setFfmpegPath(ffmpegPath.path);

console.log('ffmpeg 的路径', ffmpegPath.path);
console.log('ffmpeg 的版本', ffmpegPath.version);

/**
 * 创建一个后端服务
 */
function createServer() {
    const app = express();
    app.use(express.static(__dirname));
    // const server = http.createServer(app);
    expressWebSocket(app, null, {
        perMessageDeflate: true
    });
    app.ws("/rtsp/:id/", rtspToFlvHandle)

    app.get('/', (req, response) => {
        response.send("当你看到这个页面的时候说明rtsp流媒体服务正常启动中......")
    })

    app.listen(8100, () => {
        console.log("转换rtsp流媒体服务启动了，服务端口号为8100")
    })
}

function rtspToFlvHandle(ws, req) {
    const stream = webSocketStream(ws, {
        binary: true,
        browserBufferTimeout: 1000000
    }, {
        browserBufferTimeout: 1000000
    });
    const url = req.query.url;
    console.log("rtsp url:", url);
    console.log("rtsp params:", req.params);
    try {
        ffmpeg(url)
            .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")
            .on('start', () => {
                console.log(url, "Stream 开始");
            })
            .on("codecData", function () {
                console.log(url, "Stream codecData.")
            })
            .on("error", function (err) {
                console.log(url, "An error occured: ", err.message);
            })
            .on("end", function () {
                console.log(url, "Stream end!");
            })
            .outputFormat("flv").videoCodec("copy").noAudio().pipe(stream);
    } catch (error) {
        console.log(error);
    }
}

createServer();



