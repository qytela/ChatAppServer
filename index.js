const server = require('http').createServer().listen(8080);
const conn = require('./db').conn;
const io = require('socket.io')(server);
const { Conversation, Message, User } = require('./db').models;

const mobileSockets = {};

conn.sync({ logging: true, force: true });

io.on('connection', socket => {
    socket.on('newUser', credentials => {
        const { name, password } = credentials;
        return Promise.all([
            User.findOrCreate({
                where: { name: name, password: password }
            }),
            User.findOne({
                where: { name: name, password: password }
            })
        ])
        .then(([user, users]) => {
            mobileSockets[user.id] = socket.id;
            socket.emit('userCreated', { user: user, users });
            socket.broadcast.emit('newUser', user);
        });
    });

    socket.on('chat', users => {
        Conversation.findOrCreateConversation(users.user.id, users.receiver.id)
        .then(conversation => socket.emit('priorMessages', conversation.messages))
        .catch(err => {
            console.log(err);
        });
    });

    socket.on('message', ({ text, sender, receiver }) => {
        Message.createMessage(text, sender, receiver)
        .then(message => {
            socket.emit('incomingMessage', message);
            const receiverSocketId = mobileSockets[receiver.id];
            socket.to(receiverSocketId).emit('incomingMessage', message);
        });
    });
});