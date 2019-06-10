const server = require('http').createServer().listen(8080);
const conn = require('./db').conn;
const io = require('socket.io')(server);
const { User, Conversation, Message } = require('./db').models;

conn.sync({ logging: false, force: true });

const mobileSocket = {};

io.on('connection', socket => {
    socket.on('newUser', credentials => {
        const { name, password } = credentials;
        Promise.all([
            User.findOrCreate({
                where: {
                    name,
                    password
                }
            }),
            User.findAll()
        ])
        .then(([user, users]) => {
            mobileSocket[user[0].id] = socket.id;
            socket.emit('userCreated', { user: user[0], users });
            socket.broadcast.emit('newUser', user[0]);
        });
    });

    socket.on('chat', users => {
        Conversation.findOrCreateConversation(users.user.id, users.receiver.id)
        .then(conversation => socket.emit('priorMessages', conversation.messages));
    });

    socket.on('message', ({ text, sender, receiver }) => {
        Message.createMessage(text, sender, receiver)
        .then(message => {
            socket.emit('incomingMessage', message);
            const receiverSocketId = mobileSocket[receiver.id];
            socket.to(receiverSocketId).emit('incomingMessage', message);
        });
    });
});