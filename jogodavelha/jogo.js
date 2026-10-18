//Gustavo Sbardelotto Rezende
//Vitor Rolim Rubio Auricchio

const net = require('net'); //modulo que permite criar conexoes TCP
const readline = require('readline'); //modulo para ler o que o usuario digita no terminal

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PORTA = 5000; //porta TCP da conexao, os dois jogadores precisam usar a mesma
let meuSimbolo = ''; //simbolo deste jogador ('X' quem cria a partida, 'O' quem entra)
let socketAtivo = null; //conexao (socket) com o adversario, usada para enviar as jogadas

let tabuleiro = [ //tabuleiro 3x3 em forma de matriz, ' ' significa posicao vazia
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' ']
];
let turnoAtual = 'X'; //guarda de quem e a vez, o X sempre comeca
console.log("=== Jogo da Velha TCP ===");
console.log("1. Criar partida (Aguardar conexão - X)");
console.log("2. Entrar em uma partida (Conectar a um IP - O)");


rl.question("Escolha uma opção (1 ou 2): ", (opcao) => {
    if (opcao === '1') { //opcao 1: este jogador vira o servidor e espera o adversario conectar
        criarPartida();
    } else if (opcao === '2') { //opcao 2: este jogador vira o cliente e conecta no IP do adversario
        rl.question("Digite o IP do adversário (ex: 127.0.0.1): ", (ip) => {
            entrarPartida(ip);
        });
    } else {
        console.log("Opção inválida.");
        process.exit();
    }
});

function criarPartida() { //funcao de quem cria a partida (servidor), joga com X
    meuSimbolo = 'X';
    const servidor = net.createServer((socket) => { //cria o servidor TCP, a funcao interna roda quando o adversario se conecta
        console.log("\n[!] Adversário conectado! A partida vai começar.");
        socketAtivo = socket;
        configurarSocket(socket);
        imprimirTabuleiro();
        gerenciarTurnos(); //o X comeca, entao ja pede a primeira jogada
    });

    servidor.listen(PORTA, () => {
        console.log(`\nAguardando adversário na porta ${PORTA}...`);
    });
}

function entrarPartida(ip) { //funcao de quem entra na partida (cliente), joga com O
    meuSimbolo = 'O';
    const cliente = new net.Socket();
    
    cliente.connect(PORTA, ip, () => { //tenta conectar no IP e porta do adversario
        console.log("\n[!] Conectado ao adversário! A partida vai começar.");
        socketAtivo = cliente;
        configurarSocket(cliente);
        imprimirTabuleiro();
        gerenciarTurnos(); //o turno ainda e do X, entao aqui o O so fica aguardando
        console.log("Aguarde o adversário (X) fazer a primeira jogada.");
    });

    cliente.on('error', (err) => { //dispara se der erro na conexao (ex: IP errado ou ninguem aguardando)
        console.log("\nErro ao conectar:", err.message);
        process.exit();
    });
}

function configurarSocket(socket) {
    socket.on('data', (dados) => { //dispara toda vez que o adversario envia uma jogada
        const mensagem = dados.toString().trim(); //converte os bytes recebidos para texto e tira espacos e quebra de linha
        const partes = mensagem.split(','); //separa a mensagem "linha,coluna" em duas partes
        
        if (partes.length === 2) {
            const l = parseInt(partes[0]);
            const c = parseInt(partes[1]);
            const simboloAdversario = meuSimbolo === 'X' ? 'O' : 'X'; //se eu sou X o adversario e O, e vice-versa
            
            tabuleiro[l][c] = simboloAdversario; //marca a jogada do adversario no tabuleiro
            console.log(`\nO adversário jogou na posição: ${l},${c}`);
            imprimirTabuleiro();

            verificarFimDeJogo(); //verifica se a jogada do adversario terminou o jogo
            
            turnoAtual = meuSimbolo; //agora e a vez deste jogador
            gerenciarTurnos();
        }
    });

    socket.on('end', () => { //dispara quando o adversario fecha a conexao
        console.log("\n[!] O adversário encerrou a conexão.");
        process.exit();
    });

    socket.on('error', (err) => {
    console.log("\n[!] Conexão perdida com o adversário.");
    process.exit();
});
}

function imprimirTabuleiro() {
    console.clear(); //limpa o terminal para o tabuleiro sempre aparecer no mesmo lugar
    console.log("\n  0   1   2");
    console.log(`0 ${tabuleiro[0][0]} | ${tabuleiro[0][1]} | ${tabuleiro[0][2]}`);
    console.log("  ---------");
    console.log(`1 ${tabuleiro[1][0]} | ${tabuleiro[1][1]} | ${tabuleiro[1][2]}`);
    console.log("  ---------");
    console.log(`2 ${tabuleiro[2][0]} | ${tabuleiro[2][1]} | ${tabuleiro[2][2]}\n`);
}

function gerenciarTurnos() { //so pede a jogada se o turno atual for deste jogador
    if (turnoAtual === meuSimbolo) {
        rl.question("Sua vez! Digite linha,coluna (ex: 0,2): ", (resposta) => {
            const partes = resposta.split(',');
            
            if (partes.length === 2) {
                const l = parseInt(partes[0].trim());
                const c = parseInt(partes[1].trim());

                if (l >= 0 && l <= 2 && c >= 0 && c <= 2 && tabuleiro[l][c] === ' ') { //valida se esta dentro dos limites (0 a 2) e se a posicao esta vazia
                    tabuleiro[l][c] = meuSimbolo;
                    imprimirTabuleiro();
                    
                    socketAtivo.write(`${l},${c}\n`); //envia a jogada para o adversario como "linha,coluna", o \n marca o fim da mensagem

                    verificarFimDeJogo();
                    
                    turnoAtual = meuSimbolo === 'X' ? 'O' : 'X'; //passa o turno para o adversario
                    console.log("Aguardando jogada do adversário...");
                } else {
                    console.log("[Erro] Jogada inválida! Fora dos limites ou posição ocupada.");
                    gerenciarTurnos(); 
                }
            } else {
                console.log("[Erro] Formato incorreto. Use linha,coluna.");
                gerenciarTurnos();
            }
        });
    }
}

function verificarFimDeJogo() { //verifica se alguem venceu ou se deu empate
    const t = tabuleiro;
    const linhasVitoria = [ //as 8 combinacoes possiveis de vitoria (3 linhas, 3 colunas e 2 diagonais)
        [t[0][0], t[0][1], t[0][2]], //Linha 0
        [t[1][0], t[1][1], t[1][2]], //Linha 1
        [t[2][0], t[2][1], t[2][2]], //Linha 2
        [t[0][0], t[1][0], t[2][0]], //Coluna 0
        [t[0][1], t[1][1], t[2][1]], //Coluna 1
        [t[0][2], t[1][2], t[2][2]], //Coluna 2
        [t[0][0], t[1][1], t[2][2]], //Diagonal principal
        [t[0][2], t[1][1], t[2][0]]  //Diagonal secundária
    ];

    for (let linha of linhasVitoria) {
        if (linha[0] !== ' ' && linha[0] === linha[1] && linha[1] === linha[2]) { //venceu se a primeira posicao nao esta vazia e as tres sao iguais
            console.log(`\n[!] FIM DE JOGO! O jogador ${linha[0]} venceu!`);
            process.exit();
        }
    }

    const empate = t.every(linha => linha.every(celula => celula !== ' ')); //empate = todas as celulas preenchidas (a vitoria ja foi checada acima)
    if (empate) {
        console.log("\n[!] FIM DE JOGO! Deu velha (Empate)!");
        process.exit();
    }
}