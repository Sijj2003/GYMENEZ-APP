// ==========================================
// 3. WIZARD: KYC Y LOGÍSTICA
// ==========================================
document.getElementById('form-kyc').addEventListener('submit', (e) => {
    e.preventDefault();
    const docType = document.getElementById('kyc-doc-type').value;
    const docNumber = document.getElementById('kyc-doc-number').value.trim();
    const imageFile = document.getElementById('kyc-image').files[0];

    if (imageFile && imageFile.size > 2 * 1024 * 1024) {
        alert("La fotografía excede el límite de 2MB. Por favor comprima la imagen.");
        return;
    }

    temporaryKycData = { docType, docNumber, imageFile };
    document.getElementById('kyc-form-container').classList.add('hidden');
    document.getElementById('kyc-success-msg').classList.remove('hidden');
    
    unlockStep(2);
    document.getElementById('step-2-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
