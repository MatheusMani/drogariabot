import { Boom } from '@hapi/boom'
import P from 'pino'
import makeWASocket, {AnyMessageContent, delay, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, useSingleFileAuthState} from '../src'
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = makeInMemoryStore({ logger: P().child({ level: 'debug', stream: 'store' }) })
store.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
	store.writeToFile('./baileys_store_multi.json')
}, 10_000)

const { state, saveState } = useSingleFileAuthState('./auth_info_multi.json')

// start a connection
const startSock = async() => {
	// fetch latest version of WA Web
	const { version, isLatest } = await fetchLatestBaileysVersion()
	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

	const sock = makeWASocket({
		version,
		logger: P({ level: 'trace' }),
		printQRInTerminal: true,
		auth: state,
		// implement to handle retries
		getMessage: async key => {
			return {
				conversation: 'hello'
			}
		}
	})


	store.bind(sock.ev)

	const sendMessageWTyping = async(msg: AnyMessageContent, jid: string) => {
		await sock.presenceSubscribe(jid)
		await delay(1000)

		await sock.sendPresenceUpdate('composing', jid)
		await delay(20)

		await sock.sendPresenceUpdate('paused', jid)

		await sock.sendMessage(jid, msg)
	}
	(async() => {

	})();
	const botoes = [
		{buttonId: 'id1', buttonText: {displayText: '👨‍⚕️ Quero Ser Atendido'}, type: 1},
		{buttonId: 'id2', buttonText: {displayText: '💸 Quero Ver as Promoções.'}, type: 1},
	  ]

	  

	  
    
	sock.ev.on('chats.set', item => console.log(`recv ${item.chats.length} chats (is latest: ${item.isLatest})`))
	sock.ev.on('messages.set', item => console.log(`recv ${item.messages.length} messages (is latest: ${item.isLatest})`))
	sock.ev.on('contacts.set', item => console.log(`recv ${item.contacts.length} contacts`))

	sock.ev.on('messages.upsert', async m => {
		console.log(JSON.stringify(m, undefined, 2))
		const msg = m.messages[0]
		const boasvindas = {
			image: {url: 'Media/logo.png'},
			caption: "Olá "+ msg.pushName +"\nSeja Bem Vindo ao *Atendimendo Virtual* da Drogaria Viva Mais.",
			footer: 'Selecione uma Opção Abaixo:',
			buttons: botoes,
			headerType: 4
		}
		if(msg.message.conversation.toLowerCase() == 'ola' || msg.message.conversation.toLowerCase() == 'eai' ||
		msg.message.conversation.toLowerCase() == 'oi') {
			console.log('replying to', m.messages[0].key.remoteJid)
			await sock!.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id])
			await sendMessageWTyping(boasvindas, msg.key.remoteJid)
		}
		if(msg.message.conversation.toLowerCase() == 'bom dia' || msg.message.conversation.toLowerCase() == 'boa tarde' || msg.message.conversation.toLowerCase() == 'boa noite') {
			console.log('replying to', m.messages[0].key.remoteJid)
			await sock!.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id])
			await sendMessageWTyping(boasvindas, msg.key.remoteJid)
		}
		if (msg.message.conversation.startsWith('!bula ')){
			const bulario = require('bulario');
			const cortado = msg.message.conversation.slice(6);
			await sock!.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id])
			const busca = await bulario.pesquisar(cortado)
			await sendMessageWTyping({text:"🔎 *Realizando Busca Para:* ```"+cortado+"```"}, msg.key.remoteJid)
		if (busca.content[0] != null){
			const numProcesso = busca.content[0].numProcesso;
			const medicamento = await bulario.getMedicamento(numProcesso);
				const idBulaPacienteProtegido = busca.content[0].idBulaPacienteProtegido;
				const idBulaProfissionalProtegido = busca.content[0].idBulaProfissionalProtegido;
				const bula_paciente = await bulario.getBulaPaciente(idBulaPacienteProtegido)
				const bula_profissional = await bulario.getBulaProfissional(idBulaProfissionalProtegido)
				const templateButtons = [
					{index: 1, urlButton: {displayText: 'BAIXAR BULA EM PDF 📃', url: bula_paciente}},
					{index: 2, urlButton: {displayText: 'BAIXAR BULA2 EM PDF 📃', url: bula_profissional}},
				]
				const resultado = {
					text: "📝 *NOME*: ```"+""+busca.content[0].nomeProduto+"```\n\n🔬 *LABORATORIO*: ```"+busca.content[0].razaoSocial+"```\n\n📋 *TIPO*: ```"+medicamento.classesTerapeuticas+"```\n\n📍 *CATEGORIA*: ```"+medicamento.categoriaRegulatoria+"```\n\n🧪 *PRINCIPIO ATIVO*: ```"+medicamento.principioAtivo+"```",
				   footer: "As informações completas deste medicamento estão presente na BULA em pdf abaixo.",
				   templateButtons: templateButtons
				}
				await sendMessageWTyping(resultado, msg.key.remoteJid)			
		
		
			}
			else{
				console.log("Resultado Não Encontrado")
				await sendMessageWTyping({text:"*_Nenhum Resultado Encontrado_* 🥺\n_Verifique se digitou corretamente o nome do medicamento e tente novamente._\n*Obs:* _Você pode pesquisar pelo principio ativo ou pelo nome comercial._"}, msg.key.remoteJid)
			}
		


	
	}
		if (msg.message.buttonsResponseMessage && msg.message.buttonsResponseMessage.selectedButtonId == 'id1'){
			await sendMessageWTyping({ text: 'Digite agora como podemos lhe ajudar.' }, msg.key.remoteJid)
		}

        
	})

	sock.ev.on('messages.update', m => console.log(m))
	sock.ev.on('message-receipt.update', m => console.log(m))
	sock.ev.on('presence.update', m => console.log(m))
	sock.ev.on('chats.update', m => console.log(m))
	sock.ev.on('contacts.upsert', m => console.log(m))

	sock.ev.on('connection.update', (update) => {
		const { connection, lastDisconnect } = update
		if(connection === 'close') {
	
			// reconnect if not logged out
			if((lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
				startSock()
			} else {
			
				console.log('connection closed')
			}
			
		}
		console.log('connection update', update)
	})
	// listen for when the auth credentials is updated
	sock.ev.on('creds.update', saveState)

	return sock
}

startSock()