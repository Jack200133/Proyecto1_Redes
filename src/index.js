const { client, xml, jid } = require("@xmpp/client")
const net = require('net')
const debug = require("@xmpp/debug")
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function menu() {
  console.log('1) Registrar una nueva cuenta en el servidor')
  console.log('2) Iniciar sesión con una cuenta')
  console.log('3) Cerrar sesión con una cuenta')
  console.log('4) Eliminar la cuenta del servidor')
  console.log('5) Salir')
  rl.question('Elige una opción: ', (answer) => {
    handleMenuOption(answer)
  })
}



function handleMenuOption(option) {
  switch (option) {
    case '1':
      rl.question('Introduce el nuevo ID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {
          register(jid, password)
        })
      })
      break
    case '2':
      rl.question('Introduce el ID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {
          login(jid, password)
        })
      })
      break
    case '3':
      // Aquí deberías añadir la lógica para cerrar la sesión con la cuenta
      break
    case '4':
      // Aquí deberías añadir la lógica para eliminar la cuenta del servidor
      break
    case '5':
      rl.close()
      break
    default:
      console.log('Opción no válida. Por favor, elige una opción válida.')
      menu()
  }
}


const registerState = {successfulRegistration: false } 

async function register(username, password) {
  const client = new net.Socket()
  client.connect(5222, 'alumchat.xyz', function() {
    console.log('Connected')
    client.write('<stream:stream to="' + 'alumchat.xyz' + '" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0">');
  })

  client.on('data', function(data) {
    console.log('Received: ' + data)
    if (data.toString().includes('<stream:features>')) {
      client.write('<iq type="set" id="reg1"><query xmlns="jabber:iq:register"><username>' + username + '</username><password>' + password + '</password></query></iq>');
    } else if (data.toString().includes('iq type="result" id="reg1"')) {
      // El registro fue exitoso, procede con el inicio de sesión
      registerState.successfulRegistration = true
      client.destroy()
    } else if (data.toString().includes('<error code"409" type="cancel"><conflict xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>')) {
      // El usuario ya existe
      console.log('El usuario ya existe, por favor elige un nombre de usuario diferente.')
      client.destroy()

    }
  })

  client.on('close', function() {
    console.log('Connection closed')
    if (registerState.successfulRegistration) {
      console.log('Registro exitoso, iniciando sesión...\n\n')
      login(username, password)
    }
    else {
      menu()
    }
  })
}


async function login(jid, password) {
  const xmpp = client({
    service: 'xmpp://alumchat.xyz:5222',
    domain: 'alumchat.xyz',
    username: jid, 
    password: password,
    terminal: true,
  })

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  debug(xmpp, true)

  await xmpp.start()

  xmpp.on('error', err => {
    console.error('❌', err.toString())
  })

  xmpp.on('offline', () => {
    console.log('⏹', 'offline')
  })

  xmpp.on('stanza', async stanza => {
    if (stanza.is('iq') && stanza.attrs.type === 'get' && stanza.getChild('query', 'jabber:iq:version')) {
      const reply = new xml.Element('iq', {
          type: 'result',
          id: stanza.attrs.id,
          to: stanza.attrs.from
      }).c('query', { xmlns: 'jabber:iq:version' })
        .c('name').t('My XMPP Client').up()
        .c('version').t('1.0.0').up()
        .c('os').t('My OS');
      
      xmpp.send(reply);
  }
    if (stanza.is('presence') && stanza.attrs.from === xmpp.jid.toString()) {
      console.log('🗸', 'Successfully logged in')
      menu()
    }
  })

  xmpp.on('online', async address => {
    console.log('▶', 'online as', address.toString())
    await xmpp.send(xml('presence'))
  })

  // await xmpp.stop()
  
  //await xmpp.start({ username: jid, password: password})
}

menu()
