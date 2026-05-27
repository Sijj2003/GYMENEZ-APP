window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    
    // El middleware ya verificó la sesión, solo renderizamos el nombre
    const adminSession = JSON.parse(localStorage.getItem('adminSession'));
    if (adminSession && adminSession.name) {
        document.getElementById('admin-name-display').textContent = adminSession.name;
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('gymen_admin_token');
    window.location.href = '/apps/admin/login.html';
});
