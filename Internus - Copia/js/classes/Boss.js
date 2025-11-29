class Boss {
    constructor(x, y) {
        this.position = { x: x, y: y };
        this.velocity = { x: 0, y: 0 };
        
        // Forma circular
        this.radius = 40;
        
        // Propriedades para compatibilidade com sistema de colisão
        this.width = this.radius * 2;
        this.height = this.radius * 2;
        this.sides = {
            left: this.position.x,
            right: this.position.x + this.width,
            top: this.position.y,
            bottom: this.position.y + this.height
        };
        
        // Comportamento de perseguição
        this.detectionRadius = 1000;
        this.moveSpeed = 1.5;
        this.acceleration = 0.2;
        
        // Sistema de cores
        this.colorTimer = 0;
        this.colorChangeSpeed = 0.1;
        this.currentColor = '#FF0000';
        
        // Propriedades especiais
        this.phasesThroughWalls = true;
        this.isInvincible = true;
        this.isDead = false; // Para compatibilidade com o sistema existente
        this.health = 1; // Para evitar erros no sistema de dano
    }
    
    update(blocks, player) {
        if (!player || player.isDead) return;
        
        // Atualizar cor
        this.colorTimer += this.colorChangeSpeed;
        const colorValue = Math.sin(this.colorTimer) * 0.5 + 0.5;
        this.currentColor = this.lerpColor('#FF0000', '#800080', colorValue);
        
        // Perseguir o jogador
        const dx = player.position.x - this.position.x;
        const dy = player.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.detectionRadius && distance > 10) {
            const directionX = dx / distance;
            const directionY = dy / distance;
            
            this.velocity.x += directionX * this.acceleration;
            this.velocity.y += directionY * this.acceleration;
            
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (speed > this.moveSpeed) {
                this.velocity.x = (this.velocity.x / speed) * this.moveSpeed;
                this.velocity.y = (this.velocity.y / speed) * this.moveSpeed;
            }
        }
        
        // Aplicar velocidade (ignora colisões com blocos)
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Atualizar sides para compatibilidade
        this.sides.left = this.position.x;
        this.sides.right = this.position.x + this.width;
        this.sides.top = this.position.y;
        this.sides.bottom = this.position.y + this.height;
        
        // Reduzir velocidade gradualmente
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;
    }
    
    draw(camera) {
        const screenX = this.position.x - camera.x;
        const screenY = this.position.y - camera.y;
        
        // Desenhar círculo principal
        window.ctx.beginPath();
        window.ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
        window.ctx.fillStyle = this.currentColor;
        window.ctx.fill();
        window.ctx.closePath();
        
        // Efeito brilhante/pulsante
        window.ctx.beginPath();
        window.ctx.arc(screenX, screenY, this.radius * 0.7, 0, Math.PI * 2);
        window.ctx.fillStyle = this.addAlpha(this.currentColor, 0.6);
        window.ctx.fill();
        window.ctx.closePath();
        
        // Núcleo interno
        window.ctx.beginPath();
        window.ctx.arc(screenX, screenY, this.radius * 0.4, 0, Math.PI * 2);
        window.ctx.fillStyle = '#FFFFFF';
        window.ctx.fill();
        window.ctx.closePath();
        
        // Efeito de partículas ao redor
        this.drawParticles(screenX, screenY);
    }
    
    drawParticles(x, y) {
        const particleCount = 8;
        const time = Date.now() * 0.002;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time;
            const distance = this.radius * 1.3;
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            const particleSize = 4 + Math.sin(time * 2 + i) * 2;
            
            window.ctx.beginPath();
            window.ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            window.ctx.fillStyle = this.currentColor;
            window.ctx.fill();
            window.ctx.closePath();
        }
    }
    
    // Método vazio para compatibilidade (não colide com blocos)
    checkCollisionWithBlocks(blocks) {
        // Não faz nada - atravessa tudo
    }
    
    // Método para compatibilidade com sistema de dano
    takeDamage(damageAmount, knockbackDirection) {
        // Não toma dano - é invencível
        console.log('🛡️ Boss é invencível!');
        return false;
    }
    
    // Função para interpolar entre duas cores
    lerpColor(color1, color2, factor) {
        const hex = (color) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        
        const rgb1 = hex(color1);
        const rgb2 = hex(color2);
        
        if (!rgb1 || !rgb2) return color1;
        
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    // Adicionar transparência a uma cor hexadecimal
    addAlpha(color, alpha) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }
}