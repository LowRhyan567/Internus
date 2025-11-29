class Enemy1 {
    constructor(x, y) {
        this.position = { x: x, y: y };
        this.velocity = { x: 0, y: 0 };
        
        this.width = 60;
        this.height = 60;
        this.sides = { 
            bottom: this.position.y + this.height, 
            left: this.position.x, 
            right: this.position.x + this.width, 
            top: this.position.y 
        };
        
        this.gravity = 1;
        this.isOnGround = false;
        
        // Comportamento de perseguição
        this.detectionRadius = 400; // Distância para detectar o player
        this.moveSpeed = 2;
        this.runSpeed = 3.3; // velocidade quando muito perto
        this.jumpCooldown = 0;
        this.jumpCooldownMax = 60; // frames entre pulos
        
        // Sistema de vida
        this.health = 3;
        this.maxHealth = 3;
        this.isDead = false;
        
        // Feedback visual de dano
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 20;
        
        // Knockback quando toma dano
        this.knockbackTimer = 0;
        this.knockbackDuration = 15;

        // Comportamento adicional
        this.facing = 1; // 1 = direita, -1 = esquerda
        this.ledgeCheckDistance = 10; // distância horizontal para verificar beiral
        this.maxJumpHorizontal = 140; // distância horizontal máxima plausível de um pulo lateral
        this.maxJumpVertical = 200; // altura máxima plausível de pulo (a partir do inimigo)
    }
    
    takeDamage(damageAmount, knockbackDirection) {
        if (this.isDead) return;
        
        this.health -= damageAmount;
        this.damageFlashTimer = this.damageFlashDuration;
        
        // Aplicar knockback
        this.velocity.x = knockbackDirection * 8;
        this.velocity.y = -10;
        this.knockbackTimer = this.knockbackDuration;
        
        if (this.health <= 0) {
            this.isDead = true;
            console.log('💀 Inimigo eliminado!');
        }
    }
    
    draw(camera) {
        if (this.isDead) return;
        
        const screenX = this.position.x - camera.x;
        const screenY = this.position.y - camera.y;
        
        // Flash vermelho quando toma dano
        if (this.damageFlashTimer > 0) {
            window.ctx.fillStyle = '#FF0000';
            this.damageFlashTimer--;
        } else {
            window.ctx.fillStyle = '#169c04ff';
        }
        
        // Corpo do inimigo
        window.ctx.fillRect(screenX, screenY, this.width, this.height);
        
        // Olhos (para dar personalidade) - olhar na direção que está voltado
        window.ctx.fillStyle = 'white';
        if (this.facing > 0) {
            window.ctx.fillRect(screenX + 10, screenY + 15, 15, 15);
            window.ctx.fillRect(screenX + 35, screenY + 15, 15, 15);
            window.ctx.fillStyle = 'black';
            window.ctx.fillRect(screenX + 15, screenY + 20, 8, 8);
            window.ctx.fillRect(screenX + 40, screenY + 20, 8, 8);
        } else {
            window.ctx.fillRect(screenX + 10, screenY + 15, 15, 15);
            window.ctx.fillRect(screenX + 35, screenY + 15, 15, 15);
            window.ctx.fillStyle = 'black';
            window.ctx.fillRect(screenX + 12, screenY + 20, 8, 8);
            window.ctx.fillRect(screenX + 37, screenY + 20, 8, 8);
        }
        
        // Barra de vida
        const healthBarWidth = this.width;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;
        
        // Fundo da barra (vermelho)
        window.ctx.fillStyle = '#FF0000';
        window.ctx.fillRect(screenX, screenY - 10, healthBarWidth, healthBarHeight);
        
        // Vida atual (verde)
        window.ctx.fillStyle = '#00FF00';
        window.ctx.fillRect(screenX, screenY - 10, healthBarWidth * healthPercentage, healthBarHeight);
    }
    
    checkCollisionWithBlocks(blocks) {
        this.isOnGround = false;

        for (let block of blocks) {
            // Ignorar blocos de transição
            if (block.tipo === 'bloco_transicao') continue;
            
            if (
                this.sides.right > block.x &&
                this.sides.left < block.x + block.width &&
                this.sides.bottom > block.y &&
                this.sides.top < block.y + block.height
            ) {
                const overlapTop = this.sides.bottom - block.y;
                const overlapBottom = (block.y + block.height) - this.sides.top;
                const overlapLeft = this.sides.right - block.x;
                const overlapRight = (block.x + block.width) - this.sides.left;

                const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                if (minOverlap === overlapTop && this.velocity.y > 0) {
                    this.position.y = block.y - this.height;
                    this.velocity.y = 0;
                    this.isOnGround = true;
                }
                else if (minOverlap === overlapBottom && this.velocity.y < 0) {
                    this.position.y = block.y + block.height;
                    this.velocity.y = 0;
                }
                else if (minOverlap === overlapLeft && this.velocity.x > 0) {
                    this.position.x = block.x - this.width;
                    this.velocity.x = 0;
                }
                else if (minOverlap === overlapRight && this.velocity.x < 0) {
                    this.position.x = block.x + block.width;
                    this.velocity.x = 0;
                }
            }
        }
    }

    // Retorna true se existe chão diretamente abaixo do ponto (x, y + small) dentro de blocks
    isGroundBelowAt(x, y, blocks, maxDistance = 6) {
        // vamos checar se há um bloco cuja face superior esteja entre y e y + maxDistance
        for (let block of blocks) {
            if (block.tipo === 'bloco_transicao') continue;
            if (x >= block.x && x <= block.x + block.width) {
                const dy = block.y - y;
                if (dy >= 0 && dy <= maxDistance) {
                    return true;
                }
            }
        }
        return false;
    }

    // Checa se existe um bloco plausível para aterrissagem num intervalo horizontal e vertical razoável
    findLandingBlockToSide(direction, blocks) {
        // Procura por um bloco cujo topo esteja mais alto que o chão atual (pulo para subir) 
        // ou no mesmo nível, dentro do alcance horizontal máximo de pulo.
        const startX = this.position.x;
        const minX = startX + direction * 20;
        const maxX = startX + direction * this.maxJumpHorizontal;

        for (let block of blocks) {
            if (block.tipo === 'bloco_transicao') continue;
            // Considerar blocos que estão à frente (na direção escolhida)
            const blockCenterX = block.x + block.width / 2;
            if (direction > 0 && blockCenterX < minX) continue;
            if (direction < 0 && blockCenterX > maxX) continue;

            // Checar se o topo do bloco é atingível verticalmente
            const verticalDiff = this.position.y - block.y; // se positivo significa bloco está acima do inimigo (pular pra subir)
            if (verticalDiff < this.maxJumpVertical && verticalDiff > -40) { // -40 permite ligeira descida
                // Verificar que, ao aterrissar, o espaço do bloco comporta o inimigo (largura)
                // Simples verificação: se há espaço horizontal suficiente sobre o bloco
                if (block.width >= this.width * 0.6) {
                    // Retorna o bloco candidato
                    return block;
                }
            }
        }
        return null;
    }
    
    update(blocks, player) {
        if (this.isDead) return;
        
        // Aplicar gravidade
        this.velocity.y += this.gravity;
        
        // Reduzir knockback timer
        if (this.knockbackTimer > 0) {
            this.knockbackTimer--;
        } else {
            // Comportamento de perseguição (apenas se não está em knockback)
            if (player && !player.isDead) {
                const dx = player.position.x - this.position.x;
                const dy = player.position.y - this.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Atualiza direção que o inimigo está "olhando"
                this.facing = (dx >= 0) ? 1 : -1;
                
                // Se player está no alcance de detecção
                if (distance < this.detectionRadius) {
                    // Decide velocidade base (mais rápido se muito próximo)
                    const targetSpeed = (Math.abs(dx) < 120) ? this.runSpeed : this.moveSpeed;
                    
                    // Se muito próximo verticalmente e em cima, tenta alinhar-se horizontalmente
                    if (Math.abs(dx) > 10) {
                        this.velocity.x = (dx > 0 ? targetSpeed : -targetSpeed);
                    } else {
                        this.velocity.x = 0;
                    }
                    
                    // Verificar beiral à frente — não cair de plataformas
                    const dir = (this.velocity.x >= 0) ? 1 : -1;
                    const footX = this.position.x + (dir === 1 ? this.width - 5 : 5);
                    const footCheckX = footX + dir * (this.ledgeCheckDistance + 2);
                    const footY = this.position.y + this.height + 1;
                    
                    const groundAhead = this.isGroundBelowAt(footCheckX, footY, blocks, 10);
                    if (!groundAhead && this.isOnGround) {
                        // Não há chão à frente: tentar virar ou parar para tentar pular (se objetivo exigir)
                        // Se o player estiver do outro lado e houver um bloco para pular, tenta pular lateralmente
                        const landingBlock = this.findLandingBlockToSide(dir, blocks);
                        if (landingBlock && this.isOnGround && this.jumpCooldown <= 0) {
                            // pulo lateral seguro
                            this.velocity.y = -15;
                            // dá um impulso horizontal para alcançar
                            this.velocity.x = dir * (targetSpeed + 1.2);
                            this.jumpCooldown = this.jumpCooldownMax;
                        } else {
                            // não pode pular para frente com segurança => vira pra não cair
                            this.velocity.x = -dir * targetSpeed * 0.8;
                            this.facing = -dir;
                        }
                    } else {
                        // Quando há chão à frente, às vezes pular para plataformas mais altas (somente se puder pousar)
                        if (this.isOnGround && dy < -50 && this.jumpCooldown <= 0) {
                            // Só realiza o pulo se houver um bloco de aterrissagem plausível na direção do player
                            const jumpDir = (dx > 0) ? 1 : -1;
                            const landing = this.findLandingBlockToSide(jumpDir, blocks);
                            if (landing) {
                                this.velocity.y = -15;
                                // Horizontal boost em direção ao bloco de aterrissagem
                                this.velocity.x = jumpDir * (targetSpeed + 1.5);
                                this.jumpCooldown = this.jumpCooldownMax;
                            }
                        }
                    }
                } else {
                    // SEÇÃO CORRIGIDA: Patrulha leve (se não detecta o player)
                    if (this.isOnGround) {
                        const patrolSpeed = 0.6;
                        
                        // 1. Verificar se há chão à frente
                        const footX = this.position.x + (this.facing === 1 ? this.width - 5 : 5);
                        const footCheckX = footX + this.facing * (this.ledgeCheckDistance + 2);
                        const footY = this.position.y + this.height + 1;
                        const groundAhead = this.isGroundBelowAt(footCheckX, footY, blocks, 10);
                        
                        // 2. Se não houver chão, inverte a direção
                        if (!groundAhead) {
                            this.facing *= -1;
                        }
                        
                        // 3. Aplica a velocidade na direção final (correta)
                        this.velocity.x = this.facing * patrolSpeed;
                    }
                }
            }
        }
        
        // Reduzir cooldown de pulo
        if (this.jumpCooldown > 0) {
            this.jumpCooldown--;
        }
        
        // Aplicar velocidade
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Atualizar sides
        this.sides.left = this.position.x;
        this.sides.right = this.position.x + this.width;
        this.sides.bottom = this.position.y + this.height;
        this.sides.top = this.position.y;
        
        // Colisões
        if (blocks) {
            this.checkCollisionWithBlocks(blocks);
        }
        
        // Damping
        this.velocity.x *= 0.8;
        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        
        // Se cair fora do mundo, marcar como morto
        if (this.position.y > 5000) {
            this.isDead = true;
        }
    }
};