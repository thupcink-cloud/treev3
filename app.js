document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    async init() {
        console.log("App initialized.");
        await this.loadInitialData();
        this.bindEvents();
    },

    async loadInitialData() {
        await this.initPetData();
        this.loadPlants();
        this.loadBusyDates();
    },

    async getCurrentUserId() {
        if (typeof Auth !== 'undefined' && Auth.getCurrentUser) {
            const currentUser = await Auth.getCurrentUser();
            if (currentUser) {
                return currentUser.line_user_id || currentUser.id;
            }
        }
        let localId = localStorage.getItem('app_guest_user_id');
        if (!localId) {
            localId = 'user_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('app_guest_user_id', localId);
        }
        return localId;
    },

    // ดึงข้อมูล EXP ต้นไม้แต่ละตัว
    async getPlantExpData(plantName) {
        if (!plantName) return { level: 1, current_exp: 0, max_exp: 100 };
        const userId = await this.getCurrentUserId();

        if (typeof _supabase === 'undefined' || !_supabase || typeof _supabase.from !== 'function') {
            let allPlantsExp = JSON.parse(localStorage.getItem('user_plants_exp_registry') || '{}');
            if (!allPlantsExp[plantName]) {
                allPlantsExp[plantName] = { level: 1, current_exp: 0, max_exp: 100 };
                localStorage.setItem('user_plants_exp_registry', JSON.stringify(allPlantsExp));
            }
            return allPlantsExp[plantName];
        }

        try {
            let { data, error } = await _supabase
                .from('user_pets')
                .select('*')
                .eq('user_id', userId)
                .eq('plant_name', plantName)
                .maybeSingle();

            if (error || !data) {
                const newPetData = { user_id: userId, plant_name: plantName, level: 1, current_exp: 0, max_exp: 100 };
                await _supabase.from('user_pets').insert([newPetData]);
                return newPetData;
            }
            return data;
        } catch (err) {
            let allPlantsExp = JSON.parse(localStorage.getItem('user_plants_exp_registry') || '{}');
            return allPlantsExp[plantName] || { level: 1, current_exp: 0, max_exp: 100 };
        }
    },

    // บันทึกข้อมูล EXP ลง Supabase และ Registry
    async savePlantExpData(plantName, expData) {
        if (!plantName) return;
        const userId = await this.getCurrentUserId();

        // อัปเดตเก็บไว้ใน LocalRegistry เสมอเพื่อความเสถียรทันที
        let allPlantsExp = JSON.parse(localStorage.getItem('user_plants_exp_registry') || '{}');
        allPlantsExp[plantName] = expData;
        localStorage.setItem('user_plants_exp_registry', JSON.stringify(allPlantsExp));

        if (typeof _supabase === 'undefined' || !_supabase || typeof _supabase.from !== 'function') {
            return;
        }

        try {
            await _supabase
                .from('user_pets')
                .upsert({
                    user_id: userId,
                    plant_name: plantName,
                    level: expData.level,
                    current_exp: expData.current_exp,
                    max_exp: expData.max_exp
                }, { onConflict: 'user_id,plant_name' });
        } catch (err) {
            console.error('Save exception:', err);
        }
    },

    async initPetData() {
        let currentPet = JSON.parse(localStorage.getItem('user_pet_data')) || {};
        
        if (currentPet.activePlant && currentPet.activePlant.name) {
            const plantName = currentPet.activePlant.name;
            
            // ดึงข้อมูล EXP ล่าสุดของตัวละครนี้จาก Registry มาใช้ทันทีตอนเปิดเว็บ
            const plantExpData = await this.getPlantExpData(plantName);
            
            // ผูกค่า EXP และ Level ให้ตรงกันไม่ให้หาย
            currentPet.level = plantExpData.level;
            currentPet.current_exp = plantExpData.current_exp;
            currentPet.max_exp = plantExpData.max_exp;
            localStorage.setItem('user_pet_data', JSON.stringify(currentPet));

            const petNameEl = document.getElementById('petName');
            if (petNameEl) petNameEl.innerText = plantName;

            const dashPetLevel = document.getElementById('dashPetLevel');
            if (dashPetLevel) dashPetLevel.innerText = `Lv. ${plantExpData.level}`;

            // เรนเดอร์หน้าจอสัตว์เลี้ยงพร้อมค่า EXP ที่ถูกต้อง
            UI.renderPet(currentPet, 'normal');
        } else {
            const avatarContainer = document.querySelector('.pet-avatar-container');
            if (avatarContainer) {
                avatarContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <span style="font-size: 3rem;">🌱</span>
                        <p style="font-size: 0.9rem; color: #666; margin-top: 5px;">ยังไม่ได้เลือกสัตว์เลี้ยงต้นไม้</p>
                        <button onclick="UI_Inventory.togglePetInventoryModal()" class="btn btn-success" style="margin-top: 8px; padding: 6px 12px; font-size: 0.85rem; border-radius: 15px; background: #2e7d32; border: none; color: white; cursor: pointer;">
                            ไปหยิบจากกระเป๋า
                        </button>
                    </div>
                `;
            }
            const petNameEl = document.getElementById('petName');
            if (petNameEl) petNameEl.innerText = 'ยังไม่มีสัตว์เลี้ยง';
        }
    },

    async setActivePlant(plantId) {
        const userInventory = JSON.parse(localStorage.getItem('user_plant_inventory') || '[]');
        const selectedPlant = userInventory.find(p => p.id === plantId || p.name === plantId);
        
        if (!selectedPlant) return;

        // ดึงข้อมูล EXP ของตัวละครที่จะเปลี่ยนใส่เข้ามาให้ครบถ้วนก่อน
        const plantExpData = await this.getPlantExpData(selectedPlant.name);

        let currentPet = {
            activePlant: selectedPlant,
            level: plantExpData.level,
            current_exp: plantExpData.current_exp,
            max_exp: plantExpData.max_exp
        };

        // บันทึกลง LocalStorage ทันที
        localStorage.setItem('user_pet_data', JSON.stringify(currentPet));

        const petNameEl = document.getElementById('petName');
        if (petNameEl) petNameEl.innerText = selectedPlant.name;

        UI.renderPet(currentPet, 'normal');

        const dashPetLevel = document.getElementById('dashPetLevel');
        if (dashPetLevel) dashPetLevel.innerText = `Lv. ${plantExpData.level}`;
        
        if (typeof UI_Inventory !== 'undefined' && UI_Inventory.renderPlantInventory) {
            UI_Inventory.renderPlantInventory();
        }

        Swal.fire({
            icon: 'success',
            title: 'เปลี่ยนสัตว์เลี้ยงสำเร็จ!',
            text: `กำลังใช้งาน "${selectedPlant.name}" (Level ${plantExpData.level})`,
            timer: 1500,
            showConfirmButton: false
        });
    },

    bindEvents() {
        const addPlantForm = document.getElementById('addPlantForm');
        if (addPlantForm) {
            addPlantForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPlant();
            });
        }

        const addBusyForm = document.getElementById('addBusyForm');
        if (addBusyForm) {
            addBusyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddBusyDate();
            });
        }
    },

    loadPlants() {
        const plants = JSON.parse(localStorage.getItem('user_plants') || '[]');
        const busyDates = JSON.parse(localStorage.getItem('user_busy_dates') || '[]');
        
        const dashPlantCount = document.getElementById('dashPlantCount');
        if (dashPlantCount) dashPlantCount.innerText = plants.length;

        const plantGallery = document.getElementById('plantGallery');
        if (plantGallery) {
            if (plants.length === 0) {
                plantGallery.innerHTML = '<p class="text-muted">ยังไม่มีข้อมูลต้นไม้</p>';
            } else {
                let html = '';
                plants.forEach((plant, index) => {
                    html += `
                        <div class="plant-item-card" style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #ddd;">
                            <h4>${plant.name}</h4>
                            <p>สายพันธุ์: ${plant.species}</p>
                            <button onclick="App.deletePlant(${index})" class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem; margin-top: 5px; background: #e53935; color: white; border: none; border-radius: 5px; cursor: pointer;">ลบ</button>
                        </div>
                    `;
                });
                plantGallery.innerHTML = html;
            }
        }

        UI.generateSchedule(plants, busyDates);
        this.renderTodayTasks(plants);
    },

    handleAddPlant() {
        const nameInput = document.getElementById('plantName');
        const speciesInput = document.getElementById('plantSpecies');

        if (!nameInput || !speciesInput) return;

        const newPlant = {
            name: nameInput.value,
            species: speciesInput.value,
            next_water_time: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString()
        };

        let plants = JSON.parse(localStorage.getItem('user_plants') || '[]');
        plants.push(newPlant);
        localStorage.setItem('user_plants', JSON.stringify(plants));

        nameInput.value = '';
        this.loadPlants();

        Swal.fire({
            icon: 'success',
            title: 'เพิ่มต้นไม้สำเร็จ',
            text: 'ระบบได้เพิ่มต้นไม้ของคุณลงในตารางเรียบร้อยแล้ว',
            timer: 1500,
            showConfirmButton: false
        });
    },

    deletePlant(index) {
        let plants = JSON.parse(localStorage.getItem('user_plants') || '[]');
        plants.splice(index, 1);
        localStorage.setItem('user_plants', JSON.stringify(plants));
        this.loadPlants();
    },

    loadBusyDates() {
        const busyDates = JSON.parse(localStorage.getItem('user_busy_dates') || '[]');
        
        const dashBusyCount = document.getElementById('dashBusyCount');
        if (dashBusyCount) dashBusyCount.innerText = busyDates.length;

        const busyDatesList = document.getElementById('busyDatesList');
        if (busyDatesList) {
            if (busyDates.length === 0) {
                busyDatesList.innerHTML = '<li>ยังไม่มีบันทึกวันติดธุระ</li>';
            } else {
                let html = '';
                busyDates.forEach((bDate, index) => {
                    html += `
                        <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                            <span>📅 ${bDate}</span>
                            <button onclick="App.deleteBusyDate(${index})" style="background: none; border: none; color: #e53935; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                        </li>
                    `;
                });
                busyDatesList.innerHTML = html;
            }
        }
    },

    handleAddBusyDate() {
        const dateInput = document.getElementById('busyDate');
        const daysInput = document.getElementById('busyDays');

        if (!dateInput) return;

        const startDate = new Date(dateInput.value);
        const daysCount = parseInt(daysInput ? daysInput.value : 1) || 1;

        let busyDates = JSON.parse(localStorage.getItem('user_busy_dates') || '[]');

        for (let i = 0; i < daysCount; i++) {
            let d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateString = d.toISOString().split('T')[0];
            if (!busyDates.includes(dateString)) {
                busyDates.push(dateString);
            }
        }

        localStorage.setItem('user_busy_dates', JSON.stringify(busyDates));
        dateInput.value = '';
        this.loadBusyDates();
        this.loadPlants();

        Swal.fire({
            icon: 'success',
            title: 'บันทึกวันไม่ว่างสำเร็จ',
            text: 'ระบบได้ปรับตารางรดน้ำหลีกเลี่ยงวันดังกล่าวให้แล้ว',
            timer: 1500,
            showConfirmButton: false
        });
    },

    deleteBusyDate(index) {
        let busyDates = JSON.parse(localStorage.getItem('user_busy_dates') || '[]');
        busyDates.splice(index, 1);
        localStorage.setItem('user_busy_dates', JSON.stringify(busyDates));
        this.loadBusyDates();
        this.loadPlants();
    },

    renderTodayTasks(plants) {
        const list = document.getElementById('todayTasksList');
        if (!list) return;

        if (!plants || plants.length === 0) {
            list.innerHTML = '<li>ไม่มีรายการต้นไม้</li>';
            return;
        }

        let html = '';
        plants.forEach(plant => {
            html += `
                <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    <i class="fa-solid fa-seedling" style="color: #4CAF50;"></i> <b>${plant.name}</b> (${plant.species})
                </li>
            `;
        });
        list.innerHTML = html;
    },

    async handleWaterAction(index, plantName) {
        let currentPet = JSON.parse(localStorage.getItem('user_pet_data')) || {};
        
        if (!currentPet.activePlant) {
            Swal.fire({
                icon: 'warning',
                title: 'ยังไม่ได้เลือกสัตว์เลี้ยง',
                text: 'กรุณาไปเลือกสัตว์เลี้ยงจากกระเป๋าก่อนรดน้ำครับ',
                confirmButtonColor: '#2e7d32'
            });
            return;
        }

        const activeName = currentPet.activePlant.name;
        let plantExp = await this.getPlantExpData(activeName);

        const expGain = 20;
        plantExp.current_exp += expGain;

        let leveledUp = false;
        if (plantExp.current_exp >= plantExp.max_exp) {
            plantExp.level += 1;
            plantExp.current_exp = plantExp.current_exp - plantExp.max_exp;
            plantExp.max_exp = Math.round(plantExp.max_exp * 1.2);
            leveledUp = true;
        }

        await this.savePlantExpData(activeName, plantExp);

        currentPet.level = plantExp.level;
        currentPet.current_exp = plantExp.current_exp;
        currentPet.max_exp = plantExp.max_exp;
        localStorage.setItem('user_pet_data', JSON.stringify(currentPet));

        UI.renderPet(currentPet, leveledUp ? 'fresh' : 'normal');

        const dashPetLevel = document.getElementById('dashPetLevel');
        if (dashPetLevel) dashPetLevel.innerText = `Lv. ${plantExp.level}`;

        Swal.fire({
            icon: 'success',
            title: 'รดน้ำสำเร็จ! 💧',
            text: `คุณรดน้ำ "${plantName}" เรียบร้อย "${activeName}" ได้รับ +${expGain} EXP!`,
            timer: 1500,
            showConfirmButton: false
        });
    }
};