async function loadAthleteBiometricsProfile() {
    // Reemplaza 'user_token' por la llave exacta que uses en el login de tus atletas
    const token = localStorage.getItem('user_token'); 
    if (!token) return;

    try {
        const res = await fetch('https://sijj2003.pythonanywhere.com/api/profile/fitness-data', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();

        if (data.success && data.metrics) {
            const m = data.metrics;

            // Inyección de Métricas Base
            document.getElementById('view-weight').textContent = m.weight ? `${m.weight}` : '--';
            document.getElementById('view-height').textContent = m.height ? `${m.height}` : '--';
            document.getElementById('view-age').textContent = m.age || '--';

            // Inyección de Tren Superior
            document.getElementById('view-neck').textContent = m.neck ? `${m.neck} cm` : '--';
            document.getElementById('view-back').textContent = m.back ? `${m.back} cm` : '--';
            document.getElementById('view-thorax').textContent = m.thorax ? `${m.thorax} cm` : '--';
            document.getElementById('view-abdomen').textContent = m.abdomen ? `${m.abdomen} cm` : '--';
            document.getElementById('view-bicep-r').textContent = m.bicep_right || '--';
            document.getElementById('view-bicep-l').textContent = m.bicep_left || '--';
            document.getElementById('view-forearm-r').textContent = m.forearm_right || '--';
            document.getElementById('view-forearm-l').textContent = m.forearm_left || '--';

            // Inyección de Tren Inferior
            document.getElementById('view-waist').textContent = m.waist ? `${m.waist} cm` : '--';
            document.getElementById('view-femur-r').textContent = m.femur_right || '--';
            document.getElementById('view-femur-l').textContent = m.femur_left || '--';
            document.getElementById('view-tibia-r').textContent = m.tibia_right || '--';
            document.getElementById('view-tibia-l').textContent = m.tibia_left || '--';

            // Inyección de Capacidad Mecánica (1RM)
            document.getElementById('view-push').textContent = m.rm_push ? `${m.rm_push} kg` : '--';
            document.getElementById('view-pull').textContent = m.rm_pull ? `${m.rm_pull} kg` : '--';
            document.getElementById('view-legs').textContent = m.rm_legs ? `${m.rm_legs} kg` : '--';

            // Inyección de Ficha Médica
            document.getElementById('view-allergies').textContent = m.allergies || 'Ninguna registrada.';
            document.getElementById('view-diseases').textContent = m.chronic_diseases || 'Ninguna registrada.';
            document.getElementById('view-medical-notes').textContent = m.medical_notes || 'Sin observaciones.';
        }
    } catch (e) {
        console.error("Error al sincronizar la telemetría biológica del atleta.");
    }
}

// Aseguramos que la función se dispare automáticamente al cargar la pantalla del perfil
window.addEventListener('DOMContentLoaded', () => {
    loadAthleteBiometricsProfile();
});
