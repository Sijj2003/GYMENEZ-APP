// ====================================================================
// ⚙️ CONFIGURACIÓN DE RED Y MEMORIA DEL WIZARD (checkout_core.js)
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

// 🚀 Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Lectura segura del localStorage ante posibles corrupciones de JSON
    try {
        const storedCart = localStorage.getItem('gymenez_cart');
        cartItems = storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
        console.error('Error parsing gymenez_cart:', error);
        cartItems = [];
    }
    
    if (cartItems.length === 0) {
        // Encadenamiento opcional (?.) para evitar crasheos si falta algún ID en el HTML
        document.getElementById('checkout-loader')?.classList.add('hidden');
        document.getElementById('checkout-content')?.classList.remove('hidden'); 
        document.getElementById('checkout-container')?.classList.add('hidden');
        document.getElementById('empty-cart-msg')?.classList.remove('hidden');
    } else {
        // Comprobación de la función antes de invocarla
        if (typeof initWizardData === 'function') {
            initWizardData();
        } else {
            console.error('initWizardData no está definida en el scope actual.');
        }
    }
});
