const ffmpegPath = require('@ffmpeg-installer/ffmpeg'); // 自动为当前node服务所在的系统安装ffmpeg
const ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const webSocketStream = require('websocket-stream/stream');
const expressWebSocket = require('express-ws');

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
    app.ws('/rtsp/', rtspToFlvHandle);

    app.get('/', (req, response) => {
        response.send('当你看到这个页面的时候说明rtsp流媒体服务正常启动中......');
    });

    app.listen(8100, () => {
        console.log('转换rtsp流媒体服务启动了，服务端口号为8100');
    });
}

function rtspToFlvHandle(ws, req) {
    const stream = webSocketStream(ws, {
        binary: true,
        browserBufferTimeout: 1000000
    }, {
        browserBufferTimeout: 1000000
    });
    // const url = req.query.url;
    const url = new Buffer(req.query.url, 'base64').toString();
    console.log('rtsp url:', url);
    try {
        ffmpeg(url)
            .addInputOption(
                '-rtsp_transport', 'tcp',
                '-buffer_size', '102400'
            )
            .on('start', (commandLine) => {
                console.log(commandLine, '转码 开始');
            })
            .on('codecData', function (data) {
                console.log(data, '转码中......');
            })
            .on('progress', function (progress) {
                console.log(progress,'转码进度')
            })
            .on('error', function (err, a, b) {
                console.log(url, '转码 错误: ', err.message);
                console.log('输入错误', a);
                console.log('输出错误', b);
            })
            .on('end', function () {
                console.log(url, '转码 结束!');
            })
            // .addOutputOption(
            //     '-threads', '4',
            //     '-tune', 'zerolatency',
            //     '-preset', 'ultrafast'
            // )
            .outputFormat('flv')
            .videoCodec('libx264')
            .withSize('320x240')
            .noAudio()
            .pipe(stream);
    } catch (error) {
        console.log('抛出异常', error);
    }
}

createServer();



