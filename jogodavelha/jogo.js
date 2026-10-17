const net = require('net');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PORTA = 5000;
let meuSimbolo = '';
let socketAtivo = null;

let tabuleiro = [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' ']
];
let turnoAtual = 'X'; 
console.log("=== Jogo da Velha TCP ===");
console.log("1. Criar partida (Aguardar conexão - X)");
console.log("2. Entrar em uma partida (Conectar a um IP - O)");


rl.question("Escolha uma opção (1 ou 2): ", (opcao) => {
    if (opcao === '1') {
        criarPartida();
    } else if (opcao === '2') {
        rl.question("Digite o IP do adversário (ex: 127.0.0.1): ", (ip) => {
            entrarPartida(ip);
        });
    } else {
        console.log("Opção inválida.");
        process.exit();
    }
});

function criarPartida() {
    meuSimbolo = 'X';
    const servidor = net.createServer((socket) => {
        console.log("\n[!] Adversário conectado! A partida vai começar.");
        socketAtivo = socket;
        configurarSocket(socket);
        imprimirTabuleiro();
        gerenciarTurnos();
    });

    servidor.listen(PORTA, () => {
        console.log(`\nAguardando adversário na porta ${PORTA}...`);
    });
}

function entrarPartida(ip) {
    meuSimbolo = 'O';
    const cliente = new net.Socket();
    
    cliente.connect(PORTA, ip, () => {
        console.log("\n[!] Conectado ao adversário! A partida vai começar.");
        socketAtivo = cliente;
        configurarSocket(cliente);
        imprimirTabuleiro();
        gerenciarTurnos(); // O O aguarda a jogada do X
        console.log("Aguarde o adversário (X) fazer a primeira jogada.");
    });

    cliente.on('error', (err) => {
        console.log("\nErro ao conectar:", err.message);
        process.exit();
    });
}

function configurarSocket(socket) {
    socket.on('data', (dados) => {
        const mensagem = dados.toString().trim(); 
        const partes = mensagem.split(',');
        
        if (partes.length === 2) {
            const l = parseInt(partes[0]);
            const c = parseInt(partes[1]);
            const simboloAdversario = meuSimbolo === 'X' ? 'O' : 'X';
            
            // Regista a jogada do adversário no nosso tabuleiro
            tabuleiro[l][c] = simboloAdversario;
            console.log(`\nO adversário jogou na posição: ${l},${c}`);
            imprimirTabuleiro();

            verificarFimDeJogo();
            
            turnoAtual = meuSimbolo;
            gerenciarTurnos();
        }
    });

    socket.on('end', () => {
        console.log("\n[!] O adversário encerrou a conexão.");
        process.exit();
    });
}

function imprimirTabuleiro() {
    console.log("\n  0   1   2");
    console.log(`0 ${tabuleiro[0][0]} | ${tabuleiro[0][1]} | ${tabuleiro[0][2]}`);
    console.log("  ---------");
    console.log(`1 ${tabuleiro[1][0]} | ${tabuleiro[1][1]} | ${tabuleiro[1][2]}`);
    console.log("  ---------");
    console.log(`2 ${tabuleiro[2][0]} | ${tabuleiro[2][1]} | ${tabuleiro[2][2]}\n`);
}

function gerenciarTurnos() {
    if (turnoAtual === meuSimbolo) {
        rl.question("Sua vez! Digite linha,coluna (ex: 0,2): ", (resposta) => {
            const partes = resposta.split(',');
            
            // Validação do formato
            if (partes.length === 2) {
                const l = parseInt(partes[0].trim());
                const c = parseInt(partes[1].trim());

                if (l >= 0 && l <= 2 && c >= 0 && c <= 2 && tabuleiro[l][c] === ' ') {
                    tabuleiro[l][c] = meuSimbolo;
                    imprimirTabuleiro();
                    
                    socketAtivo.write(`${l},${c}\n`);

                    verificarFimDeJogo();
                    
                    turnoAtual = meuSimbolo === 'X' ? 'O' : 'X';
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

function verificarFimDeJogo() {
    const t = tabuleiro;
    const linhasVitoria = [
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
        if (linha[0] !== ' ' && linha[0] === linha[1] && linha[1] === linha[2]) {
            console.log(`\n[!] FIM DE JOGO! O jogador ${linha[0]} venceu!`);
            process.exit();
        }
    }

    const empate = t.every(linha => linha.every(celula => celula !== ' '));
    if (empate) {
        console.log("\n[!] FIM DE JOGO! Deu velha (Empate)!");
        process.exit();
    }
}