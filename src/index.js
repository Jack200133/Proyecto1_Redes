const { client, xml, jid } = require("@xmpp/client");
const debug = require("@xmpp/debug");

// // Configuración de tu servidor
// const xmpp = client({
//   service: "wss://alumchat.xyz:5280/xmpp-websocket", // Servicio WebSocket Seguro de tu servidor
//   domain: "alumchat.xyz", // Dominio de tu servidor
//   resource: "example", // Recurso
//   username: "tuUsuario", // Tu nombre de usuario
//   password: "tuContraseña", // Tu contraseña
// });


// const {client, xml} = require('@xmpp/client');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function menu() {
  console.log('1) Registrar una nueva cuenta en el servidor');
  console.log('2) Iniciar sesión con una cuenta');
  console.log('3) Cerrar sesión con una cuenta');
  console.log('4) Eliminar la cuenta del servidor');
  console.log('5) Salir');
  rl.question('Elige una opción: ', (answer) => {
    handleMenuOption(answer);
  });
}

function handleMenuOption(option) {
  switch (option) {
    case '1':
      // Aquí deberías añadir la lógica para registrar la cuenta en el servidor
      break;
    case '2':
      rl.question('Introduce el JID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {
          login(jid, password);
        });
      });
      break;
    case '3':
      // Aquí deberías añadir la lógica para cerrar la sesión con la cuenta
      break;
    case '4':
      // Aquí deberías añadir la lógica para eliminar la cuenta del servidor
      break;
    case '5':
      rl.close();
      break;
    default:
      console.log('Opción no válida. Por favor, elige una opción válida.');
      menu();
  }
}

async function login(jid, password) {
  const xmpp = client({
    service: 'xmpp://alumchat.xyz:5222', // reemplazar con la URL de tu servicio
    domain: 'alumchat.xyz', // reemplazar con tu dominio
    //resource: 'example', // reemplazar con tu recurso
    username: jid, 
    password: password,
    terminal: true,
  });

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  debug(xmpp, true);

  await xmpp.start();

  xmpp.on('error', err => {
    console.error('❌', err.toString());
  });

  xmpp.on('offline', () => {
    console.log('⏹', 'offline');
  });

  xmpp.on('stanza', async stanza => {
    if (stanza.is('presence') && stanza.attrs.from === xmpp.jid.toString()) {
      console.log('🗸', 'Successfully logged in');
      menu();
    }
  });

  xmpp.on('online', async address => {
    console.log('▶', 'online as', address.toString());
    await xmpp.send(xml('presence'));
  });

  // await xmpp.stop();
  
  //await xmpp.start({ username: jid, password: password});
}

menu();
