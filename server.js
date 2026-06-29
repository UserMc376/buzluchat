const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chat message', (data) => {
    console.log('Server received:', data);
    const messageId = Date.now().toString() + Math.random().toString();
    io.emit('chat message', { id: messageId, nickname: data.nickname, color: data.color, message: data.message });
  });

  const reactions = {}; // { messageId: { emoji: { count: 0, users: new Set() } } }

  socket.on('add reaction', (data) => {
    const { messageId, emoji } = data;
    if (!reactions[messageId]) reactions[messageId] = {};
    if (!reactions[messageId][emoji]) reactions[messageId][emoji] = { count: 0, users: new Set() };

    // Remove user's previous reaction
    for (let e in reactions[messageId]) {
      if (reactions[messageId][e].users.has(socket.id)) {
        reactions[messageId][e].users.delete(socket.id);
        reactions[messageId][e].count--;
      }
    }

    // Add new reaction
    reactions[messageId][emoji].users.add(socket.id);
    reactions[messageId][emoji].count++;

    const reactionData = {};
    for (let e in reactions[messageId]) {
      reactionData[e] = reactions[messageId][e].count;
    }

    io.emit('update reactions', { messageId, reactions: reactionData });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
