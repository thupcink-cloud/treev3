let timerInterval = null;

const UI = {
    switchTab(tabId, element) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add('active');
        if (element) element.classList.add('active');
    },

    renderPet(petData, statusState = 'normal') {
        petData = petData || { level: 1, current_exp: 0, max_exp: 100 };
        const badge = document.getElementById('petLevelBadge');
        const expTxt = document.getElementById('expText');
        const fill = document.getElementById('expBarFill');
        
        if (badge) badge.innerText = `Level ${petData.level || 1}`;
        if (expTxt) expTxt.innerText = `EXP: ${petData.current_exp || 0} / ${petData.max_exp || 100}`;
        if (fill) {
            const pct = Math.min(100, ((petData.current_exp || 0) / (petData.max_exp || 100)) * 100);
            fill.style.width = `${pct}%`;
        }

        const avatarContainer = document.querySelector('.pet-avatar-container');
        if (avatarContainer) {
            const lvl = petData.level || 1;

            let plantPrefix = 'sunflower'; 
            if (petData.activePlant) {
                const name = (petData.activePlant.name || '').toLowerCase();
                const species = (petData.activePlant.species || '').toLowerCase();
                
                if (name.includes('องุ่น') || species.includes('องุ่น') || petData.activePlant.id === 'grape') {
                    plantPrefix = 'grape';
                } else if (name.includes('ไม้ไผ่') || species.includes('ไม้ไผ่') || petData.activePlant.id === 'bamboo') {
                    plantPrefix = 'bamboo';
                } else {
                    plantPrefix = 'sunflower';
                }
            }

            if (lvl === 1) {
                let mediaSrc = `images/${plantPrefix}_lvl1.mp4`;
                
                avatarContainer.innerHTML = `
                    <video autoplay loop muted playsinline style="
                        width: 120px; 
                        height: 120px; 
                        object-fit: cover; 
                        border-radius: 50%; 
                        border: 4px solid #4CAF50; 
                        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                        display: block;
                    ">
                        <source src="${mediaSrc}" type="video/mp4">
                        เบราว์เซอร์ของคุณไม่รองรับวิดีโอ
                    </video>
                `;
            } 
            else {
                let assetLevel = (lvl === 2) ? 'lvl2' : 'lvl3';

                let normalSrc = `images/${plantPrefix}_${assetLevel}_normal.mp4`;
                let wiltedSrc = `images/${plantPrefix}_${assetLevel}_wilted.mp4`;
                let freshSrc = `images/${plantPrefix}_${assetLevel}_fresh.mp4`;

                const showWilted = (statusState === 'wilted');

                avatarContainer.innerHTML = `
                    <div class="pet-hover-container" style="position: relative; display: inline-block; cursor: pointer;">
                        <video class="normal-video" autoplay loop muted playsinline style="
                            width: 120px; 
                            height: 120px; 
                            object-fit: cover; 
                            border-radius: 50%; 
                            border: 4px solid #4CAF50; 
                            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                            display: ${showWilted ? 'none' : 'block'};
                        ">
                            <source src="${normalSrc}" type="video/mp4">
                        </video>
                        <video class="wilted-video" autoplay loop muted playsinline style="
                            width: 120px; 
                            height: 120px; 
                            object-fit: cover; 
                            border-radius: 50%; 
                            border: 4px solid #e53935; 
                            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                            display: ${showWilted ? 'block' : 'none'};
                        ">
                            <source src="${wiltedSrc}" type="video/mp4">
                        </video>
                        <video class="fresh-video" autoplay loop muted playsinline style="
                            width: 120px; 
                            height: 120px; 
                            object-fit: cover; 
                            border-radius: 50%; 
                            border: 4px solid #4CAF50; 
                            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                            display: none;
                        ">
                            <source src="${freshSrc}" type="video/mp4">
                        </video>
                    </div>
                `;

                const container = avatarContainer.querySelector('.pet-hover-container');
                const nVideo = container.querySelector('.normal-video');
                const wVideo = container.querySelector('.wilted-video');
                const fVideo = container.querySelector('.fresh-video');

                const showFresh = () => {
                    if (nVideo) nVideo.style.display = 'none';
                    if (wVideo) wVideo.style.display = 'none';
                    if (fVideo) fVideo.style.display = 'block';
                };

                const hideFresh = () => {
                    if (showWilted) {
                        if (wVideo) wVideo.style.display = 'block';
                        if (nVideo) nVideo.style.display = 'none';
                    } else {
                        if (nVideo) nVideo.style.display = 'block';
                        if (wVideo) wVideo.style.display = 'none';
                    }
                    if (fVideo) fVideo.style.display = 'none';
                };

                container.addEventListener('mouseenter', showFresh);
                container.addEventListener('mouseleave', hideFresh);
                container.addEventListener('touchstart', showFresh);
                container.addEventListener('touchend', hideFresh);
            }
        }
    },

    async generateSchedule(plants, busyDates) {
        const tbody = document.getElementById('scheduleTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">🤖 AI กำลังประมวลผลคำแนะนำ...</td></tr>';

        if (!plants || plants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">ยังไม่มีข้อมูลต้นไม้</td></tr>';
            return;
        }

        let rowsHTML = '';
        const targetDates = [];

        for (let i = 0; i < plants.length; i++) {
            const plant = plants[i];
            let targetDate = plant.next_water_time ? new Date(plant.next_water_time) : new Date();
            
            if (!plant.next_water_time) {
                targetDate.setHours(8, 0, 0, 0);
                const isBusy = (busyDates || []).some(bDate => new Date(bDate).toDateString() === targetDate.toDateString());
                if (isBusy) {
                    if (plant.species && plant.species.includes('แคคตัส')) {
                        targetDate.setDate(targetDate.getDate() + 2);
                    } else {
                        targetDate.setDate(targetDate.getDate() - 1);
                    }
                }
            }

            targetDates.push(targetDate);
            const dateStr = targetDate.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
            const aiAdvice = await AI.generateCareAdvice(plant.name, plant.species, dateStr, false);

            rowsHTML += `
                <tr>
                    <td><strong>${plant.name}</strong></td>
                    <td>${plant.species}</td>
                    <td>${dateStr}</td>
                    <td><span id="countdown-${i}" class="countdown-badge">กำลังคำนวณ...</span></td>
                    <td>${aiAdvice}</td>
                    <td>
                        <button id="waterBtn-${i}" class="btn btn-success" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;" disabled onclick="App.handleWaterAction(${i}, '${plant.name}')">
                            <i class="fa-solid fa-droplet"></i> รดน้ำ (+20 EXP)
                        </button>
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML = rowsHTML;
        this.startCountdowns(targetDates, plants);
    },

    startCountdowns(targetDates, plants) {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            const now = new Date().getTime();

            targetDates.forEach((targetDate, index) => {
                const element = document.getElementById(`countdown-${index}`);
                const btn = document.getElementById(`waterBtn-${index}`);
                if (!element) return;

                const distance = targetDate.getTime() - now;

                if (distance <= 0) {
                    element.innerHTML = "<strong style='color: red;'>ถึงเวลารดน้ำแล้ว!</strong>";
                    if (btn) {
                        btn.disabled = false;
                        btn.classList.add('btn-pulse');
                    }

                    const plant = plants[index];
                    if (plant && !plant._notified) {
                        plant._notified = true; 
                        
                        const currentUser = Auth.getCurrentUser();
                        if (currentUser && currentUser.line_user_id) {
                            AI.generateCareAdvice(plant.name, plant.species, "วันนี้", false).then(advice => {
                                LineBot.sendWateringReminder(currentUser.line_user_id, plant.name, advice);
                            });
                        }
                    }
                } else {
                    if (btn) {
                        btn.disabled = true;
                        btn.classList.remove('btn-pulse');
                    }

                    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    const days = Math.floor(distance / (1000 * 60 * 60 * 24));

                    let timeText = "";
                    if (days > 0) timeText += `${days} วัน `;
                    timeText += `${hours} ชม. ${minutes} นาที ${seconds} วินาที`;

                    element.innerText = `⏳ ${timeText}`;
                }
            });
        }, 1000);
    }
};

const UI_Inventory = {
    renderPlantInventory() {
        const gallery = document.getElementById('plantGallery');
        if (!gallery) return;

        const rawInventory = JSON.parse(localStorage.getItem('user_plant_inventory') || '[]');
        const userInventory = rawInventory.filter(plant => {
            const name = plant.name || '';
            return !name.includes('น้องต้นไม้ B') && !name.includes('น้องต้นไม้ ชนิดที่');
        });

        const currentPet = JSON.parse(localStorage.getItem('user_pet_data') || '{}');
        const activePlantId = currentPet.activePlant ? currentPet.activePlant.id : null;

        if (userInventory.length === 0) {
            gallery.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p class="text-muted" style="margin-bottom: 10px;">ยังไม่มีตัวละครพืชในกระเป๋า</p>
                    <a href="#" onclick="UI.switchTab('gachaTab', document.querySelector('.nav-links li:nth-child(3)'))" style="color: #2e7d32; font-weight: bold;">ไปสุ่มซองต้นไม้ก่อนเลย! 🎁</a>
                </div>
            `;
            return;
        }

        let html = '<h3 style="margin-bottom: 15px; font-size: 1.1rem; color: #2e7d32;"><i class="fa-solid fa-backpack"></i> กระเป๋าต้นไม้ของฉัน (คลิกเพื่อเลือกใช้งาน)</h3>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px;">';

        userInventory.forEach((plant) => {
            const isActive = (plant.id === activePlantId);
            html += `
                <div onclick="App.setActivePlant('${plant.id}')" style="
                    background: ${isActive ? '#e8f5e9' : '#ffffff'}; 
                    border: 2px solid ${isActive ? '#4caf50' : '#ddd'}; 
                    border-radius: 12px; 
                    padding: 12px; 
                    text-align: center; 
                    cursor: pointer; 
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                    transition: transform 0.2s;
                ">
                    <video width="80" height="80" autoplay loop muted playsinline style="border-radius: 50%; object-fit: cover; border: 2px solid #4caf50; margin-bottom: 8px;">
                        <source src="${plant.video}" type="video/mp4">
                    </video>
                    <div style="font-weight: bold; font-size: 0.9rem; color: #1b5e20; margin-bottom: 4px;">${plant.name}</div>
                    ${isActive ? '<span style="background: #4caf50; color: white; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px;">ใช้งานอยู่</span>' : '<span style="color: #666; font-size: 0.75rem;">คลิกเพื่อเปลี่ยน</span>'}
                </div>
            `;
        });

        html += '</div>';
        gallery.innerHTML = html;
    },

    togglePetInventoryModal() {
        const rawInventory = JSON.parse(localStorage.getItem('user_plant_inventory') || '[]');
        const userInventory = rawInventory.filter(plant => {
            const name = plant.name || '';
            return !name.includes('น้องต้นไม้ B') && !name.includes('น้องต้นไม้ ชนิดที่');
        });

        const currentPet = JSON.parse(localStorage.getItem('user_pet_data') || '{}');
        const activePlantId = currentPet.activePlant ? currentPet.activePlant.id : null;

        if (userInventory.length === 0) {
            Swal.fire({
                title: 'กระเป๋าว่างเปล่า',
                text: 'คุณยังไม่มีตัวละครพืชจากการสุ่มเลย ไปสุ่มซองต้นไม้ก่อนนะ!',
                icon: 'warning',
                confirmButtonText: 'ไปสุ่มซอง',
                confirmButtonColor: '#2e7d32'
            }).then((result) => {
                if (result.isConfirmed) {
                    UI.switchTab('gachaTab', document.querySelector('.nav-links li:nth-child(3)'));
                }
            });
            return;
        }

        let htmlContent = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; max-height: 350px; overflow-y: auto; padding: 10px;">';
        
        userInventory.forEach((plant) => {
            const isActive = (plant.id === activePlantId);
            htmlContent += `
                <div onclick="App.setActivePlant('${plant.id}'); Swal.close();" style="
                    background: ${isActive ? '#e8f5e9' : '#f9f9f9'}; 
                    border: 2px solid ${isActive ? '#4caf50' : '#ccc'}; 
                    border-radius: 10px; 
                    padding: 8px; 
                    text-align: center; 
                    cursor: pointer;
                ">
                    <video width="65" height="65" autoplay loop muted playsinline style="border-radius: 50%; object-fit: cover; border: 2px solid #4caf50; margin-bottom: 4px;">
                        <source src="${plant.video}" type="video/mp4">
                    </video>
                    <div style="font-weight: bold; font-size: 0.8rem; color: #1b5e20;">${plant.name}</div>
                    ${isActive ? '<span style="background: #4caf50; color: white; font-size: 0.65rem; padding: 1px 6px; border-radius: 8px;">ใช้งานอยู่</span>' : '<span style="color: #666; font-size: 0.65rem;">เลือกใช้</span>'}
                </div>
            `;
        });
        htmlContent += '</div>';

        Swal.fire({
            title: '🎒 เลือกสัตว์เลี้ยงต้นไม้',
            html: htmlContent,
            showConfirmButton: false,
            showCloseButton: true,
            width: '400px'
        });
    }
};