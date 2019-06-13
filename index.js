const server = require('http').createServer().listen(8080);
const conn = require('./db').conn;
const io = require('socket.io')(server);
const { Conversation, Message, User } = require('./db').models;

conn.sync({ logging: false, force: true });

io.on('connection', socket => {
    socket.on('newUser', credentials => {
        const { name, password } = credentials;
        return Promise.all([
            User.findOrCreate({
                where: { name: name, password: password }
            }),
            User.findAll()
        ])
        .then(([user, users]) => {
            socket.emit('userCreated', { user: user[0], users });
            socket.broadcast.emit('newUser', user[0]);
        })
        .catch(err => {
            console.log(err);
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
            socket.to(receiver.id).emit('incomingMessage', message);
        })
        .catch(err => {
            console.log(err);
        });
    });
});