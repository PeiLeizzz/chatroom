var socketio = require('socket.io')
var io
var guestNumber = 1
var nickNames = {}
var namesUsed = []
var currentRoom = {}

// 确立连接逻辑 启动Socket.IO服务器
exports.listen = function(server)
    {
        io = socketio.listen(server)
        io.set('log level', 1)
        // 定义每个用户连接的处理逻辑
        io.sockets.on('connection', function(socket)  // connection事件的监听器
        {
            // 在用户连接上来时赋予其一个访客名
            guestNumber = assignGuestName(socket, guestNumber,
                nickNames, namesUsed)
            // 在用户连接上来时把他放入聊天室Lobby里
            joinRoom(socket, 'Lobby')
            // 处理用户的消息，更名，以及聊天室的创建和变更
            handleMessageBroadcasting(socket, nickNames)
            handleNameChangeAttempts(socket, nickNames, namesUsed)
            handleRoomJoining(socket)
            // 用户发出请求时，向其提供已经被占用的聊天室的列表
            socket.on('rooms', function()
            {
                socket.emit('rooms', io.sockets.manager.rooms)
            })
            // 定义用户断开连接后的逻辑清除
            handleClientDisconnection(socket, nickNames, namesUsed)
        })
    }

// 分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed)
{
    var name = 'Guest' + guestNumber
    nickNames[socket.id] = name   // 把用户昵称和客户端连接ID关联上
    socket.emit('nameResult',     // 让用户知道他们的昵称
    {
        success: true,
        name: name
    })
    namesUsed.push(name)
    return guestNumber + 1
}

// 与进入聊天室相关的逻辑
function joinRoom(socket, room)
{
    socket.join(room)
    currentRoom[socket.id] = room
    socket.emit('joinResult', {room: room})
    // 让房间里的其他用户知道有新用户进入了房间
    socket.broadcast.to(room).emit('message',
    {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    })

    // 确定有哪些用户在这个房间里
    var usersInRoom = io.sockets.clients(room)
    if (usersInRoom.length > 1)
    {
        var usersInRoomSummery = 'Users currently in ' + room + ': '
        for (var index in usersInRoom)
        {
            var userSocketId = usersInRoom[index].id
            if (userSocketId != socket.id)  // 排除自己
            {
                if (index > 0)
                {
                    usersInRoomSummery += ', '
                }
            usersInRoomSummery += nickNames[userSocketId]
            }
        }
        usersInRoomSummery += '.'
        // 将房间里其他用户的汇总发送给这个用户
        socket.emit('message', {text: usersInRoomSummery})
    }
}

// 更名请求的处理逻辑，用户不能将昵称改成Guest开头或改成其他已经被占用的昵称
function handleNameChangeAttempts(socket, nickNames, namesUsed)
{
    socket.on('nameAttempt', function(name)
    {
        // 昵称不能以Guest开头
        if (name.indexOf('Guest') == 0)
        {
            socket.emit('nameResult',
            {
                success: false,
                message: 'Names cannot begin with "Guest".'
            })
        }
        else
        {
            // 如果昵称还没注册就注册成功
            if (namesUsed.indexOf(name) == -1)
            {
                var previousName = nickNames[socket.id]
                var previousNameIndex = namesUsed.indexOf(previousName)
                namesUsed.push(name)
                nickNames[socket.id] = name
                delete namesUsed[previousNameIndex]
                socket.emit('nameResult',
                {
                    success: true,
                    name: name
                })
                socket.broadcast.to(currentRoom[socket.id]).emit('message',
                {
                    text: previousName + ' is now known as ' + name + '.'
                })
            }
            else
            {
                socket.emit('nameResult',
                {
                    success: false,
                    message: 'That name is already in use.'
                })
            }
        }
    })
}

// 发送聊天消息
function handleMessageBroadcasting(socket)
{
    socket.on('message', function(message)
    {
        socket.broadcast.to(message.room).emit('message',
        {
            text: nickNames[socket.id] + ': ' + message.text
        })
    })
}

// 加入房间，若房间还没有，则创建并加入
function handleRoomJoining(socket)
{
    socket.on('join', function(room)
    {
        socket.leave(currentRoom[socket.id])
        joinRoom(socket, room.newRoom)
    })
}

// 用户断开连接
function handleClientDisconnection(socket)
{
    socket.on('disconnect', function()
    {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id])
        delete namesUsed[nameIndex]
        delete nickNames[socket.id]
    })
}