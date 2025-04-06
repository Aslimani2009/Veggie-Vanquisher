class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    createExplosion(position, color, count = 30) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 3,
                (Math.random() - 0.5) * 3
            ));
            
            sizes[i] = Math.random() * 0.2 + 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 1,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            map: this.createParticleTexture()
        });
        
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.userData = {
            velocities,
            lifetime: 1,
            originalOpacity: 1
        };
        
        this.particles.push(particleSystem);
        this.scene.add(particleSystem);
    }

    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createTrail(position, color) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3);
        positions[0] = position.x;
        positions[1] = position.y;
        positions[2] = position.z;
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.2,
            transparent: true,
            opacity: 0.5,
            map: this.createParticleTexture()
        });
        
        const particle = new THREE.Points(geometry, material);
        particle.userData = {
            lifetime: 0.5,
            originalOpacity: 0.5
        };
        
        this.particles.push(particle);
        this.scene.add(particle);
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.userData.lifetime -= deltaTime;
            particle.material.opacity = 
                (particle.userData.lifetime / 0.5) * particle.userData.originalOpacity;
            
            if (particle.userData.velocities) {
                const positions = particle.geometry.attributes.position.array;
                const velocities = particle.userData.velocities;
                
                for (let j = 0; j < positions.length; j += 3) {
                    const velocity = velocities[j / 3];
                    positions[j] += velocity.x * deltaTime;
                    positions[j + 1] += velocity.y * deltaTime;
                    positions[j + 2] += velocity.z * deltaTime;
                    velocity.y -= 9.8 * deltaTime;
                }
                
                particle.geometry.attributes.position.needsUpdate = true;
            }
            
            if (particle.userData.lifetime <= 0) {
                this.scene.remove(particle);
                this.particles.splice(i, 1);
            }
        }
    }
} 
