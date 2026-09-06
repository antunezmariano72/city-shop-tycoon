// =============================================
// CITY SHOP TYCOON - GAME ENGINE
// =============================================

class GameState {
    constructor() {
        this.money = 5000;
        this.customers = 0;
        this.reputation = 50;
        this.level = 1;
        this.daysPassed = 0;
        this.buildings = [];
        this.selectedBuilding = null;
        this.gameSpeed = 1;
        this.isGameRunning = true;
    }

    addMoney(amount) {
        this.money += amount;
        this.showNotification(`+$${amount}`, 'success');
    }

    spendMoney(amount) {
        if (this.money >= amount) {
            this.money -= amount;
            return true;
        }
        this.showNotification('¡Dinero insuficiente!', 'error');
        return false;
    }

    updateReputation(delta) {
        this.reputation = Math.max(0, Math.min(100, this.reputation + delta));
    }

    showNotification(text, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'error' : ''}`;
        notification.textContent = text;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    reset() {
        this.money = 5000;
        this.customers = 0;
        this.reputation = 50;
        this.level = 1;
        this.daysPassed = 0;
        this.buildings = [];
        this.selectedBuilding = null;
    }
}

class Building {
    constructor(name, type, cost, width, height, depth, color, productionRate, reputation) {
        this.name = name;
        this.type = type;
        this.cost = cost;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.color = color;
        this.productionRate = productionRate;
        this.reputation = reputation;
        this.mesh = null;
        this.position = { x: 0, y: 0, z: 0 };
        this.level = 1;
        this.customers = 0;
        this.income = 0;
        this.happiness = 75;
        this.efficiency = 100;
    }

    produce() {
        const income = this.productionRate * (this.efficiency / 100) * (this.level * 1.5);
        this.income += income;
        return income;
    }

    upgrade() {
        this.level += 1;
        this.efficiency = Math.min(100, this.efficiency + 10);
        this.productionRate *= 1.2;
        return this.level * 2000;
    }

    getInfo() {
        return `
            <div class="info-box">
                <div class="info-label">Nombre</div>
                <div class="info-value">${this.name}</div>
            </div>
            <div class="info-box">
                <div class="info-label">Nivel</div>
                <div class="info-value">${this.level}</div>
            </div>
            <div class="info-box">
                <div class="info-label">Ingresos/seg</div>
                <div class="info-value">$${(this.productionRate * this.level).toFixed(2)}</div>
            </div>
            <div class="info-box">
                <div class="info-label">Eficiencia</div>
                <div class="info-value">${this.efficiency}%</div>
            </div>
            <div class="info-box">
                <div class="info-label">Satisfacción</div>
                <div class="info-value">${this.happiness}%</div>
            </div>
            <button class="btn" onclick="game.upgradeBuilding()">Mejorar - $${this.level * 2000}</button>
            <button class="btn" onclick="game.demolishBuilding()">Demoler</button>
        `;
    }
}

class Game3D {
    constructor() {
        this.gameState = new GameState();
        this.buildings = [
            new Building('Tienda General', 'shop', 2000, 4, 5, 4, 0x00ff88, 50, 10),
            new Building('Cafetería', 'cafe', 3000, 3, 4, 3, 0xffaa00, 75, 15),
            new Building('Farmacia', 'pharmacy', 4000, 3, 6, 3, 0xff0088, 100, 20),
            new Building('Pizzería', 'pizza', 3500, 4, 4, 4, 0xff5500, 85, 18),
            new Building('Biblioteca', 'library', 2500, 5, 5, 5, 0x8800ff, 40, 12),
            new Building('Cine', 'cinema', 5000, 6, 5, 6, 0x00ffff, 120, 25),
            new Building('Pastelería', 'bakery', 2800, 3, 4, 3, 0xff99aa, 70, 14),
            new Building('Banco', 'bank', 6000, 4, 6, 4, 0xffff00, 150, 30),
        ];

        this.setupThreeJS();
        this.createCity();
        this.setupEventListeners();
        this.setupUI();
        this.startGameLoop();
    }

    setupThreeJS() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 200, 500);

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
        this.camera.position.set(50, 40, 50);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 100);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -150;
        directionalLight.shadow.camera.right = 150;
        directionalLight.shadow.camera.top = 150;
        directionalLight.shadow.camera.bottom = -150;
        this.scene.add(directionalLight);

        // Controles de cámara
        this.cameraControls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            rotating: false,
            lastX: 0,
            lastY: 0
        };

        window.addEventListener('resize', () => this.onWindowResize());
    }

    createCity() {
        // Terreno
        const groundGeometry = new THREE.PlaneGeometry(300, 300);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid visual
        const gridHelper = new THREE.GridHelper(300, 30, 0x444444, 0x888888);
        gridHelper.position.y = 0.1;
        this.scene.add(gridHelper);

        // Cielo
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);

        // Árboles decorativos
        this.createTrees();

        // Raycaster para intersecciones
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    createTrees() {
        const treePositions = [
            { x: -80, z: -80 }, { x: 80, z: -80 }, { x: -80, z: 80 }, { x: 80, z: 80 },
            { x: -120, z: 0 }, { x: 120, z: 0 }, { x: 0, z: -120 }, { x: 0, z: 120 },
            { x: -50, z: -50 }, { x: 50, z: -50 }, { x: -50, z: 50 }, { x: 50, z: 50 }
        ];

        treePositions.forEach(pos => {
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(3, 4, 12, 8),
                new THREE.MeshLambertMaterial({ color: 0x8b4513 })
            );
            trunk.position.set(pos.x, 6, pos.z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            this.scene.add(trunk);

            const foliage = new THREE.Mesh(
                new THREE.SphereGeometry(15, 8, 8),
                new THREE.MeshLambertMaterial({ color: 0x228b22 })
            );
            foliage.position.set(pos.x, 25, pos.z);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            this.scene.add(foliage);
        });
    }

    createBuildingMesh(building, position) {
        const group = new THREE.Group();

        // Estructura principal
        const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
        const material = new THREE.MeshPhongMaterial({ color: building.color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.y = building.height / 2;

        group.add(mesh);

        // Techo
        const roofGeometry = new THREE.ConeGeometry(
            Math.max(building.width, building.depth) / 1.8,
            3,
            8
        );
        const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.castShadow = true;
        roof.receiveShadow = true;
        roof.position.y = building.height + 1.5;

        group.add(roof);

        // Puerta
        const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.2);
        const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.castShadow = true;
        door.receiveShadow = true;
        door.position.set(0, 1.25, building.depth / 2 + 0.1);

        group.add(door);

        // Ventanas
        for (let i = -1; i <= 1; i++) {
            for (let j = 2; j <= 4; j++) {
                const windowGeometry = new THREE.BoxGeometry(1, 1, 0.1);
                const windowMaterial = new THREE.MeshPhongMaterial({ color: 0x87ceeb });
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(i * 1.5, j, building.depth / 2 + 0.1);
                window.castShadow = true;
                window.receiveShadow = true;
                group.add(window);
            }
        }

        group.position.set(position.x, 0, position.z);
        group.userData = { building };

        this.scene.add(group);
        building.mesh = group;
        return group;
    }

    placeBuilding(buildingTemplate) {
        const cost = buildingTemplate.cost;
        if (!this.gameState.spendMoney(cost)) return;

        const newBuilding = Object.create(buildingTemplate);
        const gridSize = 30;
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;

        this.createBuildingMesh(newBuilding, { x, z });
        this.gameState.buildings.push(newBuilding);
        this.gameState.reputation += buildingTemplate.reputation / 5;
        this.gameState.showNotification(`✓ ${buildingTemplate.name} construido`, 'success');
    }

    upgradeBuilding() {
        const building = this.gameState.selectedBuilding;
        if (!building) return;

        const upgradeCost = building.level * 2000;
        if (this.gameState.spendMoney(upgradeCost)) {
            building.upgrade();
            this.gameState.showNotification(`✓ ${building.name} mejorado a Nivel ${building.level}`, 'success');
            this.updateRightPanel();
        }
    }

    demolishBuilding() {
        const building = this.gameState.selectedBuilding;
        if (!building) return;

        const refund = Math.floor(building.cost * 0.5);
        this.gameState.addMoney(refund);
        this.scene.remove(building.mesh);
        this.gameState.buildings = this.gameState.buildings.filter(b => b !== building);
        this.gameState.selectedBuilding = null;
        this.gameState.showNotification(`Edificio demolido. Reembolso: $${refund}`, 'success');
        this.updateRightPanel();
    }

    setupEventListeners() {
        // Click izquierdo
        document.addEventListener('click', (e) => {
            if (e.button !== 0) return;
            if (e.target.tagName === 'BUTTON' || e.target.closest('.left-panel') || e.target.closest('.right-panel')) return;

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            for (let intersection of intersects) {
                let obj = intersection.object;
                while (obj.parent) {
                    if (obj.userData.building) {
                        this.selectBuilding(obj.userData.building);
                        return;
                    }
                    obj = obj.parent;
                }
            }
        });

        // Click derecho para rotar cámara
        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.cameraControls.rotating = true;
                this.cameraControls.lastX = e.clientX;
                this.cameraControls.lastY = e.clientY;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.cameraControls.rotating = false;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.cameraControls.rotating) {
                const deltaX = e.clientX - this.cameraControls.lastX;
                const deltaY = e.clientY - this.cameraControls.lastY;

                const radius = Math.sqrt(
                    this.camera.position.x ** 2 +
                    this.camera.position.z ** 2
                );

                let angle = Math.atan2(this.camera.position.z, this.camera.position.x);
                angle -= deltaX * 0.01;

                this.camera.position.x = radius * Math.cos(angle);
                this.camera.position.z = radius * Math.sin(angle);
                this.camera.lookAt(0, 0, 0);

                this.cameraControls.lastX = e.clientX;
                this.cameraControls.lastY = e.clientY;
            }
        });

        // Rueda del ratón para zoom
        document.addEventListener('wheel', (e) => {
            e.preventDefault();
            const direction = this.camera.position.clone().normalize();
            const distance = this.camera.position.length();
            const newDistance = Math.max(10, Math.min(200, distance + e.deltaY * 0.1));
            const scale = newDistance / distance;

            this.camera.position.multiplyScalar(scale);
            this.camera.lookAt(0, 0, 0);
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'w') this.cameraControls.forward = true;
            if (e.key.toLowerCase() === 's') this.cameraControls.backward = true;
            if (e.key.toLowerCase() === 'a') this.cameraControls.left = true;
            if (e.key.toLowerCase() === 'd') this.cameraControls.right = true;
            if (e.key.toLowerCase() === 'r') {
                this.gameState.reset();
                this.scene.children = this.scene.children.filter(child => 
                    child instanceof THREE.Light || child instanceof THREE.Mesh && !child.userData.building
                );
                this.updateUI();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'w') this.cameraControls.forward = false;
            if (e.key.toLowerCase() === 's') this.cameraControls.backward = false;
            if (e.key.toLowerCase() === 'a') this.cameraControls.left = false;
            if (e.key.toLowerCase() === 'd') this.cameraControls.right = false;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    selectBuilding(building) {
        this.gameState.selectedBuilding = building;
        this.updateRightPanel();

        // Visual feedback
        if (building.mesh) {
            building.mesh.children.forEach(child => {
                if (child.material) {
                    child.material.emissive.setHex(0x444444);
                }
            });
        }
    }

    setupUI() {
        const buildingsList = document.getElementById('buildingsList');
        this.buildings.forEach(building => {
            const item = document.createElement('div');
            item.className = 'building-item';
            item.innerHTML = `
                <div class="building-name">${building.name}</div>
                <div class="building-cost">Costo: $${building.cost}</div>
            `;
            item.onclick = () => this.placeBuilding(building);
            buildingsList.appendChild(item);
        });

        this.updateUI();
    }

    updateUI() {
        document.getElementById('money').textContent = `$${Math.floor(this.gameState.money)}`;
        document.getElementById('customers').textContent = this.gameState.buildings.length * 10 + Math.floor(Math.random() * 50);
        document.getElementById('reputation').textContent = `${Math.floor(this.gameState.reputation)}%`;
        document.getElementById('level').textContent = this.gameState.level;
    }

    updateRightPanel() {
        const panel = document.getElementById('infoPanel');
        if (this.gameState.selectedBuilding) {
            panel.innerHTML = this.gameState.selectedBuilding.getInfo();
        } else {
            panel.innerHTML = '<p style="color: #888; text-align: center; margin-top: 20px;">Selecciona un edificio para ver detalles</p>';
        }
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    startGameLoop() {
        let lastTime = Date.now();

        const gameLoop = () => {
            const now = Date.now();
            const deltaTime = (now - lastTime) / 1000;
            lastTime = now;

            // Movimiento de cámara
            const moveSpeed = 0.1;
            if (this.cameraControls.forward) {
                this.camera.position.x += Math.sin(Math.atan2(this.camera.position.z, this.camera.position.x)) * moveSpeed;
                this.camera.position.z += Math.cos(Math.atan2(this.camera.position.z, this.camera.position.x)) * moveSpeed;
            }
            if (this.cameraControls.backward) {
                this.camera.position.x -= Math.sin(Math.atan2(this.camera.position.z, this.camera.position.x)) * moveSpeed;
                this.camera.position.z -= Math.cos(Math.atan2(this.camera.position.z, this.camera.position.x)) * moveSpeed;
            }
            if (this.cameraControls.left) {
                const angle = Math.atan2(this.camera.position.z, this.camera.position.x);
                this.camera.position.x -= Math.cos(angle) * moveSpeed;
                this.camera.position.z += Math.sin(angle) * moveSpeed;
            }
            if (this.cameraControls.right) {
                const angle = Math.atan2(this.camera.position.z, this.camera.position.x);
                this.camera.position.x += Math.cos(angle) * moveSpeed;
                this.camera.position.z -= Math.sin(angle) * moveSpeed;
            }

            // Lógica del juego
            if (this.gameState.isGameRunning) {
                this.gameState.buildings.forEach(building => {
                    const income = building.produce();
                    this.gameState.money += income * deltaTime;
                });

                // Generar clientes
                if (Math.random() < 0.02) {
                    this.gameState.customers += Math.floor(Math.random() * 5) + 1;
                }

                // Actualizar nivel
                if (this.gameState.money > 50000 * this.gameState.level) {
                    this.gameState.level += 1;
                    this.gameState.showNotification(`¡Nivel ${this.gameState.level}!`, 'success');
                }

                this.updateUI();
            }

            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    }
}

// Iniciar juego
let game;
window.addEventListener('load', () => {
    game = new Game3D();
});
