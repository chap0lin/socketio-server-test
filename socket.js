const uuidv4 = require('uuid').v4;

let messages = [];
const rooms = []
const users = new Map();

const defaultUser = {
  id: 'anon',
  name: 'Anonymous',
};

const messageExpirationTimeMS = 5*60 * 1000;
class Connection {
  constructor(io, socket) {
    this.socket = socket;
    this.io = io;

    socket.on('getMessages', (room) => this.getMessages(room));
    socket.on('message', (value) => this.handleMessage(value.message, value.room));
    socket.on('join-room', (room) => this.joinRoom(room))
    socket.on('disconnect', () => this.disconnect());
    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  }

  joinRoom(room){
    this.socket.join(room)
    console.log('joined room:', room)
    if(rooms.map(r=>r.id).includes(room)) return
    const newRoom = {
      id: room,
      messages: []
    }
    rooms.push(newRoom)
  }
  
  sendMessage(message, room) {
    console.log("hey", room, message)

    if(!room)
      this.io.sockets.emit('message', {message, room:null});
    else
      this.io.to(room).emit("message", {message, room})
  }
  
  getMessages(room) {
    rooms.find(r => r.id == room)?.messages.forEach((message) => this.sendMessage(message, room));
  }

  handleMessage(value, room) {
    const message = {
      id: uuidv4(),
      user: users.get(this.socket) || defaultUser,
      value,
      time: Date.now()
    };

    rooms.find(r => r.id == room).messages.push(message)

    this.sendMessage(message, room);

    setTimeout(
      () => {
        rooms.find(r => r.id == room).messages = messages.filter(m => m.id !== message.id);
        this.io.sockets.emit('deleteMessage', message.id);
      },
      messageExpirationTimeMS,
    );
  }

  disconnect() {
    users.delete(this.socket);
  }
}

function chat(io) {
  io.on('connection', (socket) => {
    console.log("Connected on Socket: ", socket.id)
    console.log(socket.handshake.auth.name)
    console.log(socket.handshake.auth.room)
    new Connection(io, socket);   
  });
};

module.exports = chat;