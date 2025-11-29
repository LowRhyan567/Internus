const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Tornar ctx global para acessar em Player.js
window.ctx = ctx;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 0.85;

// Sistema de câmera
const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height
};

// Estado do jogo
let currentLevel = null;
let player = null;
let enemies = [];
let isLoadingLevel = false;

// Estado global do jogo
let gameState = {
  isPaused: false,
  showingEndScreen: false,
  showingDeathScreen: false,
  messageInput: '',
  messageSent: false
};

// Sistema de aceleração de queda
window.gravityMultiplier = 1.0;

// Coordenadas globais do campo de input e botão (definidas na animação)
const endScreenElements = {
    input: { x: 0, y: 0, width: 0, height: 0 },
    button: { x: 0, y: 0, width: 0, height: 0 }
};

// Callback para morte do player
window.onPlayerDeath = function() {
  gameState.isPaused = true;
  gameState.showingDeathScreen = true;
  console.log('💀 Game Over!');
};

// Verificar se é a última fase
function isLastPhase(levelNumber) {
  return levelNumber === 2;
}

// Enviar mensagem para o servidor
async function sendMessageToServer(message) {
  try {
    const response = await fetch('http://localhost:8001/api/mensagem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mensagem: message })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      console.log('✅ Mensagem enviada com sucesso!');
      return true;
    } else {
      console.error('❌ Erro ao enviar mensagem:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return false;
  }
}

// Mostrar tela final
function showEndScreen() {
  gameState.isPaused = true;
  gameState.showingEndScreen = true;
  gameState.messageInput = '';
  gameState.messageSent = false;
  console.log('🏁 JOGO FINALIZADO!');
}

// Reiniciar o jogo
function restartGame() {
  gameState.isPaused = false;
  gameState.showingEndScreen = false;
  gameState.showingDeathScreen = false;
  gameState.messageInput = '';
  gameState.messageSent = false;
  currentLevel = null;
  player = null;
  enemies = [];
  isLoadingLevel = false;
  window.gravityMultiplier = 1.0;
  loadLevel(1);
  console.log('🔄 Jogo reiniciado!');
}

// Carregar fase
async function loadLevel(levelNumber) {
  try {
    console.log(`Iniciando carregamento da fase ${levelNumber}...`);
    const response = await fetch(`fases/fase${levelNumber}.json`);
    if (!response.ok) throw new Error(`Fase ${levelNumber} não encontrada`);
    
    currentLevel = await response.json();
    console.log(`Fase ${levelNumber} carregada com sucesso:`, currentLevel);
    
    player = new Player();
    if (currentLevel.playerSpawn) {
      player.position.x = currentLevel.playerSpawn.x;
      player.position.y = currentLevel.playerSpawn.y;
    }
    
    enemies = [];
    if (currentLevel.inimigos && currentLevel.inimigos.length > 0) {
      for (let enemyData of currentLevel.inimigos) {
        const enemy = new Enemy1(enemyData.x, enemyData.y);
        enemies.push(enemy);
        console.log(`👾 Inimigo criado em (${enemyData.x}, ${enemyData.y})`);
      }
    }
    
    camera.x = 0;
    camera.y = 0;
    
    gameState.isPaused = false;
    gameState.showingEndScreen = false;
    gameState.showingDeathScreen = false;
    
    console.log(`Player criado na posição:`, player.position);
    console.log(`Total de inimigos: ${enemies.length}`);
    return true;
  } catch (error) {
    console.error('Erro ao carregar fase:', error);
    return false;
  }
}

// Callback para transição de fase
window.onPhaseTransition = async function(nextPhaseNumber) {
  if (isLoadingLevel) return;
  
  if (isLastPhase(currentLevel.id)) {
    console.log('🏁 Última fase detectada!');
    showEndScreen();
    return;
  }
  
  isLoadingLevel = true;
  console.log('Transicionando para fase:', nextPhaseNumber);
  await loadLevel(nextPhaseNumber);
  isLoadingLevel = false;
};

// Renderizar blocos do mapa
function drawBlocks() {
  if (!currentLevel || !currentLevel.blocos) return;
  
  for (let block of currentLevel.blocos) {
    const screenX = block.x - camera.x;
    const screenY = block.y - camera.y;
    
    if (screenX + block.width > 0 && screenX < canvas.width &&
        screenY + block.height > 0 && screenY < canvas.height) {
      
      if (block.tipo === 'bloco_transicao') {
        ctx.fillStyle = '#FFFFFF';
      } else if (block.tipo === 'bloco_lava') {
        ctx.fillStyle = block.cor || '#FF4500';
      } else {
        ctx.fillStyle = block.cor || '#8B4513';
      }

      ctx.fillRect(screenX, screenY, block.width, block.height);
      
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, block.width, block.height);
    }
  }
}

// Atualizar câmera para seguir o player
function updateCamera() {
  if (!player) return;
  
  const targetCameraX = player.position.x - camera.width / 3;
  const targetCameraY = player.position.y - camera.height / 3;
  
  camera.x += (targetCameraX - camera.x) * 0.1;
  camera.y += (targetCameraY - camera.y) * 0.1;
  
  if (currentLevel) {
    if (camera.x < 0) camera.x = 0;
    if (camera.x + camera.width > currentLevel.worldWidth) {
      camera.x = currentLevel.worldWidth - camera.width;
    }
  }
  
  if (camera.y < 0) camera.y = 0;
}

const keys = {
  left: false,
  right: false,
  fastFall: false
};

// --- Novo: Função auxiliar para enviar mensagem ---
async function trySendMessage() {
    if (gameState.messageInput.trim().length > 0) {
        const success = await sendMessageToServer(gameState.messageInput);
        if (success) {
            gameState.messageSent = true;
        }
    }
}

function animate() {
  window.requestAnimationFrame(animate);
  
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tela final com campo de mensagem
  if (gameState.showingEndScreen) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Parabéns!', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '30px Arial';
    ctx.fillText('Você alcançou o cerébro!', canvas.width / 2, canvas.height / 3 + 80);
    
    if (!gameState.messageSent) {
      ctx.font = '20px Arial';
      ctx.fillText('Deixe sua mensagem aos que virão.:', canvas.width / 2, canvas.height / 2);
      
      // Campo de input visual
      const inputWidth = 500;
      const inputHeight = 50;
      const inputX = canvas.width / 2 - inputWidth / 2;
      const inputY = canvas.height / 2 + 40;
      
      endScreenElements.input = { x: inputX, y: inputY, width: inputWidth, height: inputHeight }; // Salva coordenadas
      
      ctx.fillStyle = '#333';
      ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);
      
      ctx.fillStyle = 'white';
      ctx.font = '18px Arial';
      ctx.textAlign = 'left';
      const displayText = gameState.messageInput.length > 40 
        ? '...' + gameState.messageInput.slice(-37) 
        : gameState.messageInput;
      ctx.fillText(displayText, inputX + 10, inputY + 30);
      
      // Cursor piscante
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        const textWidth = ctx.measureText(displayText).width;
        ctx.fillRect(inputX + 10 + textWidth + 2, inputY + 10, 2, 30);
      }
      
      // Botão de Envio
      const buttonWidth = 150;
      const buttonHeight = 40;
      const buttonX = canvas.width / 2 - buttonWidth / 2;
      const buttonY = inputY + inputHeight + 20;
      
      endScreenElements.button = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight }; // Salva coordenadas
      
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENVIAR', canvas.width / 2, buttonY + buttonHeight / 2);
      
      ctx.font = '18px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Clique fora para pular ou reiniciar o jogo', canvas.width / 2, buttonY + buttonHeight + 40);
      
    } else {
      ctx.font = '24px Arial';
      ctx.fillStyle = '#00FF00';
      ctx.fillText('✓ Mensagem enviada!', canvas.width / 2, canvas.height / 2 + 20);
      
      ctx.fillStyle = 'white';
      ctx.font = '18px Arial';
      ctx.fillText('Pressione qualquer tecla ou toque/clique para reiniciar', canvas.width / 2, canvas.height / 2 + 80);
      
      endScreenElements.input = { x: 0, y: 0, width: 0, height: 0 }; // Limpa coordenadas após envio
      endScreenElements.button = { x: 0, y: 0, width: 0, height: 0 };
    }
    
    return;
  }
  
  // Tela de morte
  if (gameState.showingDeathScreen) {
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Pressione qualquer tecla ou toque/clique para reiniciar', canvas.width / 2, canvas.height / 2 + 80);
    
    return;
  }

  if (!player || !currentLevel) {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Carregando fase...', 10, 30);
    return;
  }

  const speed = 4;
  
  if (!gameState.isPaused) {
    if (keys.left) {
      player.velocity.x = -speed;
    } else if (keys.right) {
      player.velocity.x = speed;
    } else {
      player.velocity.x = 0;
    }
  }

  if (!gameState.isPaused) {
    player.update(currentLevel.blocos, enemies);
    
    for (let enemy of enemies) {
      if (!enemy.isDead) {
        enemy.update(currentLevel.blocos, player);
      }
    }
    
    enemies = enemies.filter(enemy => !enemy.isDead);
  }
  
  updateCamera();
  drawBlocks();
  
  for (let enemy of enemies) {
    if (!enemy.isDead) {
      enemy.draw(camera);
    }
  }
  
  player.draw(camera);

  // HUD
  ctx.textAlign = 'left';
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  
  const healthText = `❤️ ${player.health}/${player.maxHealth}`;
  ctx.strokeText(healthText, 15, 35);
  ctx.fillText(healthText, 15, 35);
  
  const enemyText = `👾 ${enemies.length}`;
  ctx.strokeText(enemyText, 15, 70);
  ctx.fillText(enemyText, 15, 70);
  
  ctx.font = 'bold 18px Arial';
  ctx.strokeText(currentLevel.nome || 'Fase', 15, 100);
  ctx.fillText(currentLevel.nome || 'Fase', 15, 100);
}

// Carregar fase 1 ao iniciar
(async function initGame() {
  console.log('🎮 Iniciando jogo...');
  await loadLevel(1);
  console.log('✅ Fase carregada, iniciando animação...');
  animate();
})();

// Função de pulo
function jump() {
  if (player && !gameState.isPaused && player.jump()) {
    console.log('🦘 Pulo realizado!');
  }
}

// --- Novo: Função de restart para click/touch ---
function handleRestartInteraction(event) {
  // Se na tela de morte OU tela final COM mensagem enviada, reiniciar
  if (gameState.showingDeathScreen || (gameState.showingEndScreen && gameState.messageSent)) {
    event.preventDefault();
    restartGame();
    return true;
  }
  return false;
}

// --- Novo: Função para verificar se o ponto está dentro de um retângulo ---
function isPointInside(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
}

// Controles de teclado
window.addEventListener('keydown', async (event) => {
  // Tela final - gerenciar input de mensagem
  if (gameState.showingEndScreen && !gameState.messageSent) {
    if (event.key === 'Enter') {
      await trySendMessage(); // Tenta enviar
      return;
    } else if (event.key === 'Escape') {
      restartGame(); // ESC agora reinicia
      return;
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      gameState.messageInput = gameState.messageInput.slice(0, -1);
      return;
    } else if (event.key.length === 1 && gameState.messageInput.length < 100) {
      event.preventDefault();
      gameState.messageInput += event.key;
      return;
    }
    event.preventDefault();
    return;
  }
  
  // Tela final após mensagem enviada ou morte - reiniciar
  if (handleRestartInteraction(event)) {
    return;
  }
  
  if (gameState.isPaused) return;

  if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' ', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
  }

  switch(event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      jump();
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keys.right = true;
      break;
    case ' ':
    case 'ArrowDown':
    case 's':
    case 'S':
      window.gravityMultiplier = 2.0;
      keys.fastFall = true;
      console.log('⬇️ Queda rápida ativada!');
      break;
    case '1':
      if (!isLoadingLevel) {
        isLoadingLevel = true;
        loadLevel(1).then(() => { isLoadingLevel = false; });
      }
      break;
    case '2':
      if (!isLoadingLevel) {
        isLoadingLevel = true;
        loadLevel(2).then(() => { isLoadingLevel = false; });
      }
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch(event.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keys.right = false;
      break;
    case ' ':
    case 'ArrowDown':
    case 's':
    case 'S':
      window.gravityMultiplier = 1.0;
      keys.fastFall = false;
      break;
  }
});

// --- NOVO: Listener para click na tela (Desktop e Mobile com click) ---
window.addEventListener('click', async (event) => {
    // 1. Prioridade: Reinício da tela de morte / tela final (após mensagem)
    if (handleRestartInteraction(event)) {
        return;
    }

    // 2. Lógica da Tela Final ANTES do envio
    if (gameState.showingEndScreen && !gameState.messageSent) {
        const x = event.clientX;
        const y = event.clientY;

        const inputRect = endScreenElements.input;
        const buttonRect = endScreenElements.button;
        
        // Verifica se clicou no botão ENVIAR
        if (isPointInside(x, y, buttonRect)) {
            await trySendMessage();
            event.preventDefault(); // Impede que o click seja tratado como restart (se houver listeners fora do canvas)
            return;
        }

        // Verifica se clicou dentro do campo de input (só impede o restart, mas não faz nada de fato, pois o input é visual)
        if (isPointInside(x, y, inputRect)) {
            event.preventDefault();
            return;
        }

        // Se clicou em QUALQUER LUGAR FORA do botão e do campo de input, REINICIA o jogo.
        event.preventDefault();
        restartGame();
        return;
    }
});


// Controles touch/mobile
const btnUp = document.getElementById('btn-up');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnFastFall = document.getElementById('btn-attack');

if (btnUp) {
  btnUp.addEventListener('click', (e) => { 
    if (gameState.isPaused) return;
    e.stopPropagation();
    e.preventDefault(); 
    jump(); 
  });
  btnUp.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault();
    e.stopPropagation();
    jump(); 
  }, { passive: false });
}

if (btnLeft) {
  btnLeft.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    keys.left = true; 
  });
  btnLeft.addEventListener('mouseup', () => { 
    keys.left = false; 
  });
  btnLeft.addEventListener('mouseleave', () => { 
    keys.left = false; 
  });
  btnLeft.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    keys.left = true; 
  }, { passive: false });
  btnLeft.addEventListener('touchend', () => { 
    keys.left = false; 
  });
}

if (btnRight) {
  btnRight.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    keys.right = true; 
  });
  btnRight.addEventListener('mouseup', () => { 
    keys.right = false; 
  });
  btnRight.addEventListener('mouseleave', () => { 
    keys.right = false; 
  });
  btnRight.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    keys.right = true; 
  }, { passive: false });
  btnRight.addEventListener('touchend', () => { 
    keys.right = false; 
  });
}

if (btnFastFall) {
  btnFastFall.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    window.gravityMultiplier = 2.0;
    keys.fastFall = true;
  });
  btnFastFall.addEventListener('mouseup', () => { 
    window.gravityMultiplier = 1.0;
    keys.fastFall = false;
  });
  btnFastFall.addEventListener('mouseleave', () => { 
    window.gravityMultiplier = 1.0;
    keys.fastFall = false;
  });
  btnFastFall.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    window.gravityMultiplier = 2.0;
    keys.fastFall = true;
  }, { passive: false });
  btnFastFall.addEventListener('touchend', () => { 
    window.gravityMultiplier = 1.0;
    keys.fastFall = false;
  });
}

// --- NOVO: Listener para touch na tela (Mobile), fora dos botões de controle ---
canvas.addEventListener('touchstart', async (e) => { 
  e.preventDefault();
  
  // O evento touchstart no canvas não se propaga para os botões do DOM, 
  // mas precisamos mapear a coordenada de toque para a tela do canvas.
  
  const rect = canvas.getBoundingClientRect();
  // Se for um evento touch, pegamos as coordenadas do primeiro toque
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;

  // 1. Prioridade: Reinício da tela de morte / tela final (após mensagem)
  // Nota: handleRestartInteraction usa event.preventDefault(), mas não impede o fluxo aqui
  if (gameState.showingDeathScreen || (gameState.showingEndScreen && gameState.messageSent)) {
      restartGame();
      return;
  }
  
  // 2. Lógica da Tela Final ANTES do envio
  if (gameState.showingEndScreen && !gameState.messageSent) {
      const inputRect = endScreenElements.input;
      const buttonRect = endScreenElements.button;
      
      // Ajustamos as coordenadas do retângulo para o canvas (já feito acima com rect.left/top)
      
      // Verifica se tocou no botão ENVIAR
      if (isPointInside(x, y, buttonRect)) {
          await trySendMessage();
          return;
      }

      // Verifica se tocou dentro do campo de input
      if (isPointInside(x, y, inputRect)) {
          // Apenas impede o restart
          return;
      }

      // Se tocou em QUALQUER LUGAR FORA do botão e do campo de input, REINICIA o jogo.
      restartGame();
      return;
  }
  
}, { passive: false });

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.85;
  camera.width = canvas.width;
  camera.height = canvas.height;
});
