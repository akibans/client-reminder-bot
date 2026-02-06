import whatsappService from '../../services/whatsappService.js';

export default (io, socket) => {
  // Send current status on connection
  socket.emit('whatsapp:status', whatsappService.getStatus());

  // Handle manual reconnect request
  socket.on('whatsapp:reconnect', async () => {
    try {
      await whatsappService.reconnect();
    } catch (error) {
      socket.emit('whatsapp:error', error.message);
    }
  });

  // Handle disconnect request
  socket.on('whatsapp:disconnect', async () => {
    try {
      await whatsappService.disconnect();
    } catch (error) {
      socket.emit('whatsapp:error', error.message);
    }
  });
};
