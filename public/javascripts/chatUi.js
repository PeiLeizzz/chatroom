// peilei email: 714838284@qq.com
// 显示可疑文本
function divOthersEscapedContentElement(message)
{
    return $('<div></div>').text(message)
}

//显示用户自己的可疑的内容
function divMyEscapedContentElement(message)
{
    return $('<div id="MyMessage"></div>').text(message)
}

// 显示系统创建的受信内容
function divSystemContentElement(message)
{
    return $('<div></div>').html('<i id="systemMessage">' + message + '</i>')
}

// 处理原始的用户输入
function processUserInput(chatApp, socket)
{
    var message = $('#sendMessage').val()
    var systemMessage
    // 如果用户输入的内容以斜杠(/)开头，则将其作为聊天命令
    if (message.charAt(0) == '/')
    {
        systemMessage = chatApp.processCommand(message)
        if (systemMessage)
        {
            $('#messages').append(divSystemContentElement(systemMessage))
        }
    }
    // 将非命令输入广播给其他用户（和自己）
    else
    {
        chatApp.sendMyMessage(message)
        chatApp.sendOthersMessage($('#room').text(), message)
        $('#messages').scrollTop($('#messages').prop('scrollHeight'))
    }
    $('#sendMessage').val('')
}

// 客户端程序初始化逻辑
var socket = io.connect()

$(document).ready(function()
    {
        var chatApp = new Chat(socket)
        // 显示更名尝试的结果
        socket.on('nameResult', function(result)
        {
            var message
            if (result.success)
            {
                message = 'You are now known as ' + result.name + '.'
            }
            else
            {
                message = result.message
            }
            $('#messages').append(divSystemContentElement(message))
        })

        // 显示房间变更结果
        socket.on('joinResult', function(result)
        {
            $('#room').text(result.room)
            $('#messages').append(divSystemContentElement('Room changed.'))
        })

        //显示自己的消息
        socket.on('myMessage', function(message)
        {
            $('#messages').append(divMyEscapedContentElement(message.text))
        })

        // 显示接收到的其他用户的消息
        socket.on('othersMessage', function(message)
        {
            $('#messages').append(divOthersEscapedContentElement(message.text))
        })

        // 显示接收到的系统的消息
        socket.on('systemMessage', function(message)
        {
            $('#messages').append(divSystemContentElement(message.text))
        })

        // 显示可用房间列表
        socket.on('rooms', function(rooms)
        {
            $('#roomList').empty()
            for(var room in rooms)
            {
                room = room.substring(1, room.length)
                if (room != '')
                {
                    $('#roomList').append(divOthersEscapedContentElement(room))
                }
            }
            // 点击房间名可以换到那个房间中
            $('#roomList div').click(function()
            {
                chatApp.processCommand('/join ' + $(this).text())
                $('#sendMessage').focus()
            })
        })

        // 定期请求可用房间列表
        setInterval(function()
        {
            socket.emit('rooms')
        }, 1000)

        $('#sendMessage').focus()
        // 提交表单可以发送聊天消息
        $('#sendForm').submit(function()
        {
            processUserInput(chatApp, socket)
            return false
            // 这个return有什么用？
            // 答：阻止表单的自动提交，即关闭了主线程的提交
        })
    })