// 相当于定义一个类，在初始化时传入一个Socket.io的参数socket
var Chat = function(socket)
    {
        this.socket = socket
    }

// 发送其他人的聊天消息
Chat.prototype.sendOthersMessage = function(room, text)
    {
        var message = 
        {
            room: room,
            text: text
        }
        this.socket.emit('othersMessage', message)
    }

// 发送自己的聊天消息
Chat.prototype.sendMyMessage = function(message)
    {
        this.socket.emit('myMessage', message)
    }

// 变更房间
Chat.prototype.changeRoom = function(room)
    {
        this.socket.emit('join', {newRoom: room})
    }

// 处理聊天命令
Chat.prototype.processCommand = function(command)
    {
        // 对用户输入的指令进行切片 例如用户输入"/nick 123", 则变为["/nick", "123"]
        var words = command.split(' ')
        // 如上例, command = "nick"
        var command = words[0].substring(1, words[0].length).toLowerCase()
        var message = false

        switch (command)
        {
            case 'join':
                // shift()方法：把数组中的第一个元素删除，并返回第一个元素的值
                words.shift()
                var room = words.join(' ')  // 利用join()方法变为字符串
                this.changeRoom(room)
                break
            case 'nick':
                words.shift()
                var name = words.join(' ')
                this.socket.emit('nameAttempt', name)
                break
            default:
                message = 'Unrecognized command.'
                break
        }

        return message
    }