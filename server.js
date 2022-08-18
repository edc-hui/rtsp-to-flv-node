const ffmpegPath = require('@ffmpeg-installer/ffmpeg'); // 自动为当前node服务所在的系统安装ffmpeg
const ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const webSocketStream = require('websocket-stream/stream');
const expressWebSocket = require('express-ws');

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * 创建一个后端服务
 */
function createServer() {
    const app = express();
    app.use(express.static(__dirname));
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

/**
 * rtsp 转换 flv 的处理函数
 * @param ws
 * @param req
 */
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
                // commandLine 是完整的ffmpeg命令
                console.log(commandLine, '转码 开始');
            })
            .on('codecData', function (data) {
                console.log(data, '转码中......');
            })
            .on('progress', function (progress) {
                // console.log(progress,'转码进度')
            })
            .on('error', function (err, a, b) {
                console.log(url, '转码 错误: ', err.message);
                console.log('输入错误', a);
                console.log('输出错误', b);
            })
            .on('end', function () {
                console.log(url, '转码 结束!');
            })
            .addOutputOption(
                '-threads', '4',  // 一些降低延迟的配置参数
                '-tune', 'zerolatency',
                '-preset', 'superfast'
            )
            .outputFormat('flv') // 转换为flv格式
            .videoCodec('libx264') // ffmpeg无法直接将h265转换为flv的，故需要先将h265转换为h264，然后再转换为flv
            // .withSize('50%') // 转换之后的视频分辨率原来的50%, 如果转换出来的视频仍然延迟高，可按照文档上面的描述，自行降低分辨率
            .noAudio() // 去除声音
            .pipe(stream);
    } catch (error) {
        console.log('抛出异常', error);
    }
}

createServer();



