const http = require("http");
const request = require('request');

const client_id = "Ov23limpQmaxtJEpMq7F";
const client_secret = "1c2b5d7313a2cb63a1671812c42e0d4c18bb6960";
const proxy_url = "https://github.com/login/oauth/access_token";

http.createServer(function (req, res) {
    const {method, headers} = req;
    if(method === 'POST') {
        if(req.url == '/get_accesstoken') {
            let msg = '';
            req.on('data', (data)=>{
                msg += data
            })
            req.on('end', ()=> {
                let obj = JSON.parse(msg);
                if(obj.client_id != client_id) {
                    res.write("404");
                    res.end();
                    return;
                }
                request.post(proxy_url, {
                    headers: {
                        'content-type': 'application/json;charset=UTF-8',
                        'accept': 'application/json'
                    },
                    form: {
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'code': obj.code,
                    },
                }, (err, grsp, gbody)=>{
                    res.write(gbody)
                    res.end()
                })
            })

        }
    } else {
        res.write('404 not Found')
        res.end()
    }
}).listen(9099);

console.log('Gitalk 代理服务器已启动，监听端口 9099');