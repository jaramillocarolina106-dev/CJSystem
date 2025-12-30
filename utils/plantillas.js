// ===================================================
// 📧 PLANTILLAS DE CORREO CJSystem HelpDesk
// ===================================================

// Nuevo ticket creado
exports.plantillaNuevoTicket = (ticket, usuario, empresa) => `
  <h2 style="color:#1a237e;">Nuevo Ticket Creado</h2>
  
  <p><b>Empresa:</b> ${empresa.nombre}</p>
  <p><b>Cliente:</b> ${usuario.nombre}</p>
  <p><b>Título del ticket:</b> ${ticket.titulo}</p>
  <p><b>Prioridad:</b> ${ticket.prioridad}</p>

  <br>
  <a href="${process.env.BASE_URL}/ver-ticket.html?id=${ticket._id}"
     style="padding:12px 20px; background:#3949ab; color:white; border-radius:8px; 
            text-decoration:none; display:inline-block;">
     Ver Ticket
  </a>

  <br><br>
  <small>Notificación automática generada por CJSystem HelpDesk</small>
`;


// Estado actualizado
exports.plantillaEstado = (ticket) => `
  <h2 style="color:#1a237e;">Actualización de Estado</h2>

  <p>El ticket <b>${ticket.titulo}</b> ha cambiado de estado a:</p>
  <h3 style="color:#3949ab;">${ticket.estado.toUpperCase()}</h3>

  <br>
  <a href="${process.env.BASE_URL}/ver-ticket.html?id=${ticket._id}"
     style="padding:12px 20px; background:#3949ab; color:white; border-radius:8px; 
            text-decoration:none; display:inline-block;">
     Ver Ticket
  </a>

  <br><br>
  <small>Notificación automática generada por CJSystem HelpDesk</small>
`;


// Nuevo comentario
exports.plantillaComentario = (ticket, autor, mensaje) => `
  <h2 style="color:#1a237e;">Nuevo Comentario</h2>

  <p><b>${autor.nombre}</b> comentó:</p>
  <blockquote style="background:#eef2ff; padding:10px; border-left:4px solid #3949ab;">
    ${mensaje}
  </blockquote>

  <br>
  <a href="${process.env.BASE_URL}/ver-ticket.html?id=${ticket._id}"
     style="padding:12px 20px; background:#3949ab; color:white; border-radius:8px; 
            text-decoration:none; display:inline-block;">
     Ver Ticket
  </a>

  <br><br>
  <small>Notificación automática generada por CJSystem HelpDesk</small>
`;
