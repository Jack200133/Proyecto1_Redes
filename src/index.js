const { client, xml, jid } = require("@xmpp/client")
const parse = require("@xmpp/xml/lib/parse")
const net = require('net')
const debug = require("@xmpp/debug")
const readline = require('readline')
const messageQueue = []
const groupchat = []
const contacts = {}
const registerState = {successfulRegistration: false } 

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




async function register(username, password) {
  const client = new net.Socket()
  client.connect(5222, 'alumchat.xyz', function() {
    console.log('Connected')
    client.write('<stream:stream to="' + 'alumchat.xyz' + '" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0">')
  })

  client.on('data', function(data) {
    console.log('Received: ' + data)
    if (data.toString().includes('<stream:features>')) {
      client.write('<iq type="set" id="reg1"><query xmlns="jabber:iq:register"><username>' + username + '</username><password>' + password + '</password></query></iq>')
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



const addContact = async (xmpp, contactJid) => {
  try {
    const presenceStanza =  xml('presence', { to: `${contactJid}@alumchat.xyz`, type: 'subscribe' })
    await xmpp.send(presenceStanza)
    console.log('Solicitud de contacto enviada a', contactJid)
  } catch (error) {
    console.log('Error al agregar contacto', error)
  }
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

    console.log('\n')
    console.log('1) Mostrar todos los contactos y su estado')
    console.log('2) Agregar un usuario a los contactos')
    console.log('3) Mostrar detalles de contacto de un usuario')
    console.log('4) Comunicación 1 a 1 con cualquier usuario/contacto')
    console.log('5) Participar en conversaciones grupales')
    console.log('6) Definir mensaje de presencia')
    console.log('7) Enviar/recibir notificaciones')
    console.log('8) Enviar/recibir archivos')
    console.log('9) Cerrar sesion')
    rl.question('\nElige una opción: ',async (answer) => {
      await handleSecondMenuOption(answer)
    })


  }

  const handleGroup = (option) => { 
    switch (option) {
      case '1':
        // Crear grupo
        rl.question('Introduce el nombre del grupo: ', (groupName) => {
          const groupJid = `${groupName}@conference.alumchat.xyz/${xmpp.jid.local}`
          const groupStanza = xml('presence', { to: groupJid }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }))
          xmpp.send(groupStanza)
          console.log(`Intentando crear o unirse al grupo ${groupName}`)

          const configRequest = xml('iq', { to: groupJid, type: 'get' }, xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' }))
          xmpp.send(configRequest)
          secondMenu()
        });
        break;
      case '2':
        // Enviar mensaje a grupo
        rl.question('Introduce el nombre del grupo: ', (groupName) => {
          rl.question('Introduce el mensaje que deseas enviar: ', (message) => {
            const groupJid = `${groupName}@conference.alumchat.xyz`;
            const messageStanza = xml('message', { to: groupJid, type: 'groupchat' }, xml('body', {}, message));
            xmpp.send(messageStanza);
            secondMenu();
          });
        });
        break;
      case '3':
        // Agregar usuario a grupo
        rl.question('Introduce el nombre del grupo: ', (groupName) => {
          rl.question('Introduce el JID del usuario que deseas agregar: ', (contactJid) => {
            const groupJid = `${groupName}@conference.alumchat.xyz`;
            const inviteStanza = xml('message', { to: groupJid },
              xml('x', { xmlns: 'http://jabber.org/protocol/muc#user' },
                xml('invite', { to: `${contactJid}@alumchat.xyz` })
              )
            );
            xmpp.send(inviteStanza);
            console.log(`Invitación enviada a ${contactJid} para unirse al grupo ${groupName}`);
            secondMenu();
          });
        });
        break;
      default:
        console.log('Opción no válida. Por favor, elige una opción válida.');
        secondMenu();
    }
  }
  

  const handleSecondMenuOption = async(option) => {
    switch (option) {
      case '1':
        console.log('Contactos:')
        for (const contact in contacts) {
          
          console.log(`- ${contact}: ${contact.show || 'disponible'} (${contact.status || 'sin estado'})`);
        }
        secondMenu()
        break
      case '2':
        rl.question('Introduce el ID del usuario que deseas agregar: ',async (contactJid) => {
          addContact(xmpp, contactJid)
          secondMenu()
        })
        break
      case '3':
        rl.question('Introduce el JID del usuario del que deseas ver detalles: ', (contactJid) => {
          const contact = contacts[contactJid + '@alumchat.xyz']
          if (contact) {
            console.log(`Detalles de ${contactJid}: ${contact.show || 'disponible'} (${contact.status || 'sin estado'})`)
          } else {
            console.log('No se encontró el usuario o no está en tu lista de contactos.')
          }
          secondMenu()
        })
        break
      case '4':
        rl.question('Introduce el JID del usuario con el que deseas chatear: ', (contactJid) => {
          rl.question('Introduce el mensaje que deseas enviar: ', (message) => {
            const messageStanza = xml(
              'message',
              { type: 'chat', to: contactJid + '@alumchat.xyz' },
              xml('body', {}, message),
            )
            xmpp.send(messageStanza)
            secondMenu()
          })
        })
        break
      case '5':
        console.log('1) Crear grupo')
        console.log('2) Enviar mensaje a grupo')
        console.log('3) Agregar usuario a grupo')
        rl.question('\nElige una opción: ', (answer) => {
          handleGroup(answer)
        })
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
        await xmpp.stop()
        break
      default:
        console.log('Opción no válida. Por favor, elige una opción válida.')
        secondMenu()
    }
  }

  xmpp.on('stanza', async (stanza) => {
    console.log('Received stanza:', stanza.toString())

    if (stanza.is('message')) {
      // Agregar el mensaje a la cola en lugar de procesarlo inmediatamente
      messageQueue.push(stanza)
      
      // Manejar invitaciones a salas de grupo
      if (stanza.is('message') && stanza.getChild('x', 'http://jabber.org/protocol/muc#user') 
          && stanza.getChild('x', 'http://jabber.org/protocol/muc#user').getChild('invite')) 
      {
        const roomJid = stanza.attrs.from
        console.log(`Has sido invitado a la sala ${roomJid}`)
        const presenceStanza = xml(
          'presence',
          { to: roomJid + '/' + xmpp.jid.local },
          xml('x', { xmlns: 'http://jabber.org/protocol/muc' })
        )
        xmpp.send(presenceStanza)
        console.log(`Te has unido a la sala ${roomJid}`)
      }
      // Manejar mensajes 1 a 1
      else if (stanza.is('message') && stanza.attrs.type === 'chat' && stanza.getChild('body')) {
        const from = stanza.attrs.from
        const message = stanza.getChildText('body')
        console.log(`📥 Nuevo mensaje de ${from}: ${message}`)
      } 
      // Manejar mensajes de grupo
      else if (stanza.is('message') && stanza.attrs.type === 'groupchat') {
        const from = stanza.attrs.from;
        const roomJid = from.split('/')[0];  // Obtiene el JID de la sala sin el recurso (nombre del usuario)
        const senderNickname = from.split('/')[1];  // Obtiene el nickname del usuario que envió el mensaje
        const body = stanza.getChildText('body');
        
        if (body) {  // Verifica si realmente hay un cuerpo en el mensaje
            console.log(`Mensaje de ${senderNickname} en sala ${roomJid}: ${body}`);
        }
    }
    }
    else if (stanza.is('presence') && stanza.attrs.from === xmpp.jid.toString() && stanza.attrs.type !== 'unavailable') {
      console.log('🗸', 'Successfully logged in')
      secondMenu()
      // Cambiar a segundo menu de comunicacion
    }
    else if (stanza.is('presence')){
      if (stanza.attrs.type === 'subscribe'){
        console.log(`Solicitud de suscripcion de ${stanza.attrs.from}`)
        xmpp.send(xml('presence', { to: stanza.attrs.from, type: 'subscribed' }))
        console.log(`Has aceptado la solicitud de ${stanza.attrs.from}`)
      }
      else if (stanza.attrs.type === 'subscribed'){
        console.log(`El usuario ${stanza.attrs.from} ha aceptado tu solicitud de suscripcion`)
      }
      else if(!stanza.attrs.type){
        console.log(`El usuario ${stanza.attrs.from} esta disponible`)
        const contactJid = stanza.attrs.from.split('/')[0]
        if (contactJid !== xmpp.jid.bare().toString()) {  // Comprueba si el JID del contacto es diferente al tuyo
          const status = stanza.getChild('status')?.getText()
          const show = stanza.getChild('show')?.getText()
          contacts[contactJid] = {status, show}
        }
      }
      
    }

    // staza = stanza: <iq type="get" id="695-32514" to="car20593xx@alumchat.xyz/6thtpmnl4k" from="alumchat.xyz"><query xmlns="jabber:iq:version"/></iq>
    else if (stanza.is('iq') && stanza.attrs.type === 'get' && stanza.getChild('query', 'jabber:iq:version')) {
      const reply = xml('iq', {type: 'result', id: stanza.attrs.id, to: stanza.attrs.from}, xml('query', {xmlns: 'jabber:iq:version'}, xml('name', {}, 'NodeJS XMPP Client'), xml('version', {}, '1.0.0')))
    
      xmpp.send(reply)
      

    }
     // Cuando recibimos el formulario de configuración después de intentar crear una sala

    else if (stanza.is('iq') && stanza.attrs.type === 'result' && stanza.getChild('query', 'http://jabber.org/protocol/muc#owner')) {
      const roomJid = stanza.attrs.from;
      console.log(`Recibido formulario de configuración para ${roomJid}.`);
      
      // Aquí puedes modificar el formulario según tus necesidades. 
      // Por ahora, vamos a aceptar los valores predeterminados y enviar el formulario de vuelta.
      const submitForm = xml('iq', { to: roomJid, type: 'set' }, xml('query', { xmlns: 'http://jabber.org/protocol/muc#owner' }, xml('x', { xmlns: 'jabber:x:data', type: 'submit' })));
      xmpp.send(submitForm);
  
      console.log(`Grupo ${roomJid} creado y configurado.`);
    }

  })


  xmpp.on('online', async (address) => {
    console.log('▶', 'online as', address.toString())
    await xmpp.send(xml('presence'))
    // resolve(xmpp)
  })

  xmpp.on('error',async (err) => {
    console.error('\n\n❌', err.toString())

    if (err.condition === 'not-authorized') {
      console.error('❌ Autenticación fallida. Verifica tu ID de cuenta y contraseña.')
    } else {
      console.error('❌', err.toString())
    }
    // xmpp.stop()
    // reject(err)
    menu()
  })

  xmpp.on('offline', () => {
    console.log('⏹', 'offline')

    //resolve(xmpp)  
    menu()
  })

  xmpp.start().catch(() =>{})

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
    console.log('Received stanza:', stanza.toString())

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
