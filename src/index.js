const { client, xml, jid } = require("@xmpp/client")
const parse = require("@xmpp/xml/lib/parse")
const net = require('net')
const debug = require("@xmpp/debug")
const readline = require('readline')
const messageQueue = []


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function menu() {
  console.log('1) Registrar una nueva cuenta en el servidor')
  console.log('2) Iniciar sesión con una cuenta')
  console.log('3) Eliminar la cuenta del servidor')
  console.log('4) Salir del programa')
  rl.question('\nElige una opción: ', (answer) => {
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
      rl.question('Introduce el ID para la cuenta: ', (jid) => {
        rl.question('Introduce la contraseña para la cuenta: ', (password) => {
          deleteAccount(jid, password)
        })
      })
      break
    case '4':
      console.log('Saliendo del programa...')
      rl.close()
      process.exit(0)

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
    // terminal: true,
  })

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  debug(xmpp, true)

  
  const secondMenu = ()=> {
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log('\n');
    console.log('1) Mostrar todos los contactos y su estado');
    console.log('2) Agregar un usuario a los contactos');
    console.log('3) Mostrar detalles de contacto de un usuario');
    console.log('4) Comunicación 1 a 1 con cualquier usuario/contacto');
    console.log('5) Participar en conversaciones grupales');
    console.log('6) Definir mensaje de presencia');
    console.log('7) Enviar/recibir notificaciones');
    console.log('8) Enviar/recibir archivos');
    console.log('9) Cerrar sesion');
    rl2.question('\nElige una opción: ', (answer) => {
      handleSecondMenuOption(answer,rl2)
    })
  }

  const handleSecondMenuOption = async(option,reader) => {
    switch (option) {
      case '1':
        // Mostrar todos los contactos y su estado
        break
      case '2':
        // Agregar un usuario a los contactos
        break
      case '3':
        // Mostrar detalles de contacto de un usuario
        break
      case '4':
        // Comunicación 1 a 1 con cualquier usuario/contacto
        break
      case '5':
        // Participar en conversaciones grupales
        break
      case '6':
        // Definir mensaje de presencia
        break
      case '7':
        // Enviar/recibir notificaciones
        break
      case '8':
        // Enviar/recibir archivos
        break
      case '9':
        // Cerrar sesion
        await xmpp.send(xml('presence', {type: 'unavailable'}))
        xmpp.stop()
        reader.close()
        break
      default:
        console.log('Opción no válida. Por favor, elige una opción válida.')
        secondMenu()
    }
  }



  xmpp.on('stanza', async (stanza) => {
    console.log('Received stanza:', stanza.toString());

    if (stanza.is('message')) {
      // Agregar el mensaje a la cola en lugar de procesarlo inmediatamente
      messageQueue.push(stanza);
    }
    else if (stanza.is('presence') && stanza.attrs.from === xmpp.jid.toString()) {
      console.log('🗸', 'Successfully logged in')
      secondMenu()
      // Cambiar a segundo menu de comunicacion
    }
    // staza = stanza: <iq type="get" id="695-32514" to="car20593xx@alumchat.xyz/6thtpmnl4k" from="alumchat.xyz"><query xmlns="jabber:iq:version"/></iq>
    else if (stanza.is('iq') && stanza.attrs.type === 'get' && stanza.getChild('query', 'jabber:iq:version')) {
      const reply = xml('iq', {type: 'result', id: stanza.attrs.id, to: stanza.attrs.from}, xml('query', {xmlns: 'jabber:iq:version'}, xml('name', {}, 'NodeJS XMPP Client'), xml('version', {}, '1.0.0')))
    
      xmpp.send(reply);
      

    }

  })
  xmpp.on('online', async (address) => {
    console.log('▶', 'online as', address.toString())
    await xmpp.send(xml('presence'))
  })

  xmpp.on('error',async (err) => {
    console.error('\n\n❌', err.toString())

    if (err.condition === 'not-authorized') {
      console.error('❌ Autenticación fallida. Verifica tu ID de cuenta y contraseña.');
    } else {
      console.error('❌', err.toString())
    }
    xmpp.stop()
  })

  xmpp.on('offline', () => {
    console.log('⏹', 'offline')

    menu()

  })

  xmpp.start().catch(console.error)
}

async function deleteAccount(jid, password) {
  const xmpp = client({
    service: 'xmpp://alumchat.xyz:5222',
    domain: 'alumchat.xyz',
    username: jid, 
    password: password,
    terminal: true,
  })

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  debug(xmpp, true)

  xmpp.on('stanza', async (stanza) => {
    console.log('Received stanza:', stanza.toString());

    if (stanza.is('iq') && stanza.attrs.type === 'result') {
      console.log('🗸', 'Successfully deleted account')
      
    }
  })

  xmpp.on('error', (err) => {
    console.error('❌', err.toString())
  })

  xmpp.on('online', async () => {
    console.log('▶', 'online as', xmpp.jid.toString(), '\n')

    const deleteStanza = xml(
      'iq',
      { type: 'set', id: 'delete1' },
      xml('query', { xmlns: 'jabber:iq:register' }, xml('remove'))
    )
    try{

      await xmpp.send(deleteStanza)
    }
    catch(err){
      console.log(err)
    }finally{
      
      await xmpp.stop()
    }
  })

  xmpp.on('offline', () => {
    xmpp.stop()
    console.log('⏹', 'offline')

    menu()


  })

  xmpp.start().catch(console.error)
}


menu()
