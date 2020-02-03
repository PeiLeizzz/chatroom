var http = require('http')
var fs = require('fs')
var path = require('path')
var mime = require('mime')
var chatServer = require('./lib/chatServer')
var cache = {}  // 用来缓存文件内容的对象

// 在所请求的文件不存在时发送404错误
function send404(response)
{
    response.writeHead(404, {'Content-Type': 'text/plain'})
    response.write('Error 404: resource not found.')
    response.end()
}

// 提供文件数据服务 这个函数先写出正确的HTTP头，然后发送文件的内容
function sendFile(response, filePath, fileContents)
{
    response.writeHead(200, 
        {
            "content-type": mime.lookup(path.basename(filePath))
        })
    response.end(fileContents)
}

// 提供静态文件服务 如果文件被缓存了，就返回它；否则从硬盘中读取并返回它；
// 如果文件不存在，则返回一个HTTP 404错误作为响应
function serveStatic(response, cache, absPath)
{
    if (cache[absPath])
    {
        sendFile(response, absPath, cache[absPath])  // 从缓存中返回文件
    }
    else
    {
        fs.exists(absPath, function(exists)  // 检查文件是否存在
        {
            if (exists)
            {
                fs.readFile(absPath, function(err, data)  // 从硬盘中读取文件
                {
                    if(err)
                    {
                        send404(response)
                    }
                    else
                    {
                        cache[absPath] = data
                        sendFile(response, absPath, data)
                    }
                })
            }
            else
            {
                send404(response)
            }
        })
    }
}


// 创建HTTP服务器的逻辑
var server = http.createServer(function(request, response)
    {
        var filePath = false
        
        if (request.url == '/')
        {
            filePath = 'public/index.html'
        }
        else
        {
            filePath = 'public' + request.url  // 将URL路径转为文件的相对路径
        }

        var absPath = './' + filePath
        serveStatic(response, cache, absPath)
    })

// 启动HTTP服务器 要求服务器监听TCP/IP端口XXXX
server.listen(2333, function()
    {
        console.log("Server listening on port 2333.")
    })

// 启动Socket.IO服务器，给它提供一个已经定义好的HTTP服务器，这样它就能跟HTTP服务器共享同一个TCP/IP端口
chatServer.listen(server)