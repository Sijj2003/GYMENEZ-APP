// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED Y MEMORIA DEL WIZARD
// ====================================================================
const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? 'http://127.0.0.1:5000' 
    : 'https://sijj2003.pythonanywhere.com';

const TOKEN_KEY = 'gymen_auth_token';
const deviceId = localStorage.getItem('gymen_device_id') || ''; 

let currentPaymentMethod = 'pago_movil';
let cartTotal = 0;
let cartItems = [];
let isShippingComplete = false;
let globalAgencies = []; 
let temporaryKycData = null; 

// 💱 Variables de Divisas (Tasa BCV)
let currentBcvRate = 0;
let isBcvValid = false;

// 💰 Formateador de moneda (Estilo VE: 1.000.000,00)
function formatMoney(amount) {
    return Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 🛡️ Variables de la Bóveda Segura
let vaultInterval = null;
let isCartLocked = false;
let hasAcceptedMultiStore = false;

document.addEventListener('DOMContentLoaded', () => {
    cartItems = JSON.parse(localStorage.getItem('gymenez_cart')) || [];
    
    if (cartItems.length === 0) {
        // Encadenamiento opcional en todos los nodos para evitar errores silenciados
        document.getElementById('checkout-loader')?.classList.add('hidden');
        document.getElementById('checkout-content')?.classList.remove('hidden'); 
        document.getElementById('checkout-container')?.classList.add('hidden');
        document.getElementById('empty-cart-msg')?.classList.remove('hidden');
    } else {
        initWizardData(); 
    }
});
